package com.bfi.ecm.Services.ServicesImpl;

import co.elastic.clients.elasticsearch._types.FieldValue;
import co.elastic.clients.elasticsearch._types.aggregations.Aggregation;
import co.elastic.clients.elasticsearch._types.aggregations.StringTermsBucket;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.Operator;
import co.elastic.clients.elasticsearch._types.query_dsl.TextQueryType;
import com.bfi.ecm.Entities.Document;
import com.bfi.ecm.Entities.Folder;
import com.bfi.ecm.Entities.SearchDocument;
import com.bfi.ecm.Entities.User;
import com.bfi.ecm.Mappers.DocumentDto;
import com.bfi.ecm.Mappers.FacetBucket;
import com.bfi.ecm.Mappers.SearchHitDto;
import com.bfi.ecm.Mappers.SearchResultsDto;
import com.bfi.ecm.Repository.DocumentRepository;
import com.bfi.ecm.Repository.FolderRepository;
import com.bfi.ecm.Services.SearchService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.client.elc.ElasticsearchAggregations;
import org.springframework.data.elasticsearch.NoSuchIndexException;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.query.HighlightQuery;
import org.springframework.data.elasticsearch.core.query.highlight.Highlight;
import org.springframework.data.elasticsearch.core.query.highlight.HighlightField;
import org.springframework.data.elasticsearch.core.query.highlight.HighlightParameters;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ElasticsearchSearchService implements SearchService {

    private static final Logger log = LoggerFactory.getLogger(ElasticsearchSearchService.class);
    private static final String MIME_TYPE_FACET = "mimeType";
    private static final String FOLDER_FACET = "folder";

    private final ElasticsearchOperations operations;
    private final DocumentRepository documentRepository;
    private final FolderRepository folderRepository;
    private final AccessPolicy accessPolicy;
    private final CurrentUserProvider currentUser;

    @Override
    @Transactional(readOnly = true)
    public SearchResultsDto search(String query, String folderId, String mimeType, int page, int size) {
        User user = currentUser.get();
        SearchHits<SearchDocument> hits;
        try {
            hits = operations.search(buildQuery(user, query.trim(), folderId, mimeType, page, size), SearchDocument.class);
        } catch (NoSuchIndexException e) {
            return new SearchResultsDto(0, page, size, List.of(), Map.of());
        } catch (DataAccessException e) {
            log.warn("Search query failed: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Search is temporarily unavailable");
        }

        Map<String, Document> documents = documentRepository.findByUuidIn(hits.stream().map(SearchHit::getId).toList()).stream()
                .collect(Collectors.toMap(Document::getUuid, Function.identity()));
        List<SearchHitDto> results = hits.stream()
                .map(hit -> toHit(user, hit, documents.get(hit.getId())))
                .filter(Objects::nonNull)
                .toList();
        return new SearchResultsDto(hits.getTotalHits(), page, size, results, facets(user, hits));
    }

    private NativeQuery buildQuery(User user, String text, String folderId, String mimeType, int page, int size) {
        HighlightParameters highlightParameters = HighlightParameters.builder()
                .withPreTags("<mark>")
                .withPostTags("</mark>")
                .withEncoder("html")
                .withFragmentSize(160)
                .withNumberOfFragments(3)
                .build();
        Highlight highlight = new Highlight(highlightParameters, List.of(new HighlightField("title"), new HighlightField("content")));

        return NativeQuery.builder()
                .withQuery(q -> q.bool(bool -> boolQuery(bool, user, text, folderId, mimeType)))
                .withAggregation(MIME_TYPE_FACET, Aggregation.of(a -> a.terms(t -> t.field("mimeType").size(10))))
                .withAggregation(FOLDER_FACET, Aggregation.of(a -> a.terms(t -> t.field("folderId").size(10))))
                .withHighlightQuery(new HighlightQuery(highlight, SearchDocument.class))
                .withPageable(PageRequest.of(page, size))
                .withTrackTotalHits(true)
                .build();
    }

    private BoolQuery.Builder boolQuery(BoolQuery.Builder bool, User user, String text, String folderId, String mimeType) {
        bool.must(m -> m.multiMatch(mm -> mm
                .query(text)
                .fields("title^3", "title.folded^2", "content", "content.folded", "folderPath")
                .fuzziness("AUTO")
                .operator(Operator.And)));
        bool.should(s -> s.multiMatch(mm -> mm
                .query(text)
                .type(TextQueryType.Phrase)
                .fields("title^5", "content^2")));
        bool.should(s -> s.multiMatch(mm -> mm
                .query(text)
                .type(TextQueryType.BoolPrefix)
                .fields("title.prefix", "title.prefix._2gram", "title.prefix._3gram")));
        if (!accessPolicy.isAdmin(user)) {
            List<FieldValue> principals = List.of(
                    FieldValue.of(SearchIndexer.userPrincipal(user.getUuid())),
                    FieldValue.of(SearchIndexer.rolePrincipal(String.valueOf(user.getRole()))));
            bool.filter(f -> f.terms(t -> t.field("allowedPrincipals").terms(v -> v.value(principals))));
        }
        if (folderId != null) {
            bool.filter(f -> f.term(t -> t.field("folderAncestors").value(folderId)));
        }
        if (mimeType != null) {
            bool.filter(f -> f.term(t -> t.field("mimeType").value(mimeType)));
        }
        return bool;
    }

    private SearchHitDto toHit(User user, SearchHit<SearchDocument> hit, Document document) {
        if (document == null || document.isDeleted()) {
            return null;
        }
        return accessPolicy.documentAccess(user, document)
                .map(access -> new SearchHitDto(DocumentDto.fromEntity(document, access), hit.getScore(), hit.getHighlightFields()))
                .orElse(null);
    }

    private Map<String, List<FacetBucket>> facets(User user, SearchHits<SearchDocument> hits) {
        if (!(hits.getAggregations() instanceof ElasticsearchAggregations aggregations)) {
            return Map.of();
        }
        List<StringTermsBucket> mimeBuckets = buckets(aggregations, MIME_TYPE_FACET);
        List<StringTermsBucket> folderBuckets = buckets(aggregations, FOLDER_FACET);
        Map<String, String> folderNames = folderNames(user, folderBuckets.stream().map(bucket -> bucket.key().stringValue()).toList());
        return Map.of(
                MIME_TYPE_FACET, mimeBuckets.stream()
                        .map(bucket -> new FacetBucket(bucket.key().stringValue(), bucket.key().stringValue(), bucket.docCount()))
                        .toList(),
                FOLDER_FACET, folderBuckets.stream()
                        .filter(bucket -> folderNames.containsKey(bucket.key().stringValue()))
                        .map(bucket -> new FacetBucket(bucket.key().stringValue(), folderNames.get(bucket.key().stringValue()), bucket.docCount()))
                        .toList());
    }

    private static List<StringTermsBucket> buckets(ElasticsearchAggregations aggregations, String name) {
        var aggregation = aggregations.get(name);
        if (aggregation == null || !aggregation.aggregation().getAggregate().isSterms()) {
            return List.of();
        }
        return aggregation.aggregation().getAggregate().sterms().buckets().array();
    }

    private Map<String, String> folderNames(User user, Collection<String> folderIds) {
        return folderIds.stream()
                .map(folderRepository::findByUuid)
                .flatMap(Optional::stream)
                .filter(folder -> accessPolicy.folderAccess(user, folder).isPresent())
                .collect(Collectors.toMap(Folder::getUuid, Folder::getName));
    }
}
