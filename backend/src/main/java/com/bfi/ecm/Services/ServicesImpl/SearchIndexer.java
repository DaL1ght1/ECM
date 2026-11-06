package com.bfi.ecm.Services.ServicesImpl;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.HealthStatus;
import co.elastic.clients.elasticsearch.cluster.HealthResponse;
import com.bfi.ecm.Configurations.SearchProperties;
import com.bfi.ecm.Entities.Document;
import com.bfi.ecm.Entities.DocumentVersion;
import com.bfi.ecm.Entities.Folder;
import com.bfi.ecm.Entities.FolderPermission;
import com.bfi.ecm.Entities.SearchDocument;
import com.bfi.ecm.Events.SearchIndexEvent;
import com.bfi.ecm.Repository.DocumentRepository;
import com.bfi.ecm.Repository.FolderPermissionRepository;
import com.bfi.ecm.Services.BlobStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.IndexOperations;
import org.springframework.data.elasticsearch.core.query.IndexQuery;
import org.springframework.data.elasticsearch.core.query.IndexQueryBuilder;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class SearchIndexer {

    private static final Logger log = LoggerFactory.getLogger(SearchIndexer.class);

    private final ElasticsearchOperations operations;
    private final ElasticsearchClient client;
    private final DocumentRepository documentRepository;
    private final FolderPermissionRepository permissionRepository;
    private final BlobStorage blobStorage;
    private final TextExtractor textExtractor;
    private final SearchProperties searchProperties;
    private final TransactionTemplate transactionTemplate;
    private final AtomicBoolean indexReady = new AtomicBoolean();

    public SearchIndexer(ElasticsearchOperations operations,
                         ElasticsearchClient client,
                         DocumentRepository documentRepository,
                         FolderPermissionRepository permissionRepository,
                         BlobStorage blobStorage,
                         TextExtractor textExtractor,
                         SearchProperties searchProperties,
                         PlatformTransactionManager transactionManager) {
        this.operations = operations;
        this.client = client;
        this.documentRepository = documentRepository;
        this.permissionRepository = permissionRepository;
        this.blobStorage = blobStorage;
        this.textExtractor = textExtractor;
        this.searchProperties = searchProperties;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Async
    @TransactionalEventListener
    public void onIndexEvent(SearchIndexEvent event) {
        if (searchProperties.indexingEnabled()) {
            sync(event.documentIds());
        }
    }

    @Async
    @EventListener(ApplicationReadyEvent.class)
    public void createIndexOnStartup() {
        if (!searchProperties.indexingEnabled()) {
            return;
        }
        try {
            ensureIndex();
        } catch (DataAccessException e) {
            log.warn("Search index {} is not available yet: {}", searchProperties.index(), e.getMessage());
        }
    }

    @Scheduled(fixedDelayString = "${ecm.search.reconcile-interval:PT1M}", initialDelayString = "${ecm.search.reconcile-initial-delay:PT30S}")
    public void reconcile() {
        if (searchProperties.indexingEnabled()) {
            reconcileStale();
        }
    }

    @Async
    public void rebuild() {
        try {
            IndexOperations index = operations.indexOps(SearchDocument.class);
            if (index.exists()) {
                index.delete();
            }
            indexReady.set(false);
            ensureIndex();
            transactionTemplate.executeWithoutResult(status -> documentRepository.markAllStale());
            reconcileStale();
            log.info("Search index {} rebuilt", searchProperties.index());
        } catch (DataAccessException e) {
            log.warn("Search index rebuild failed: {}", e.getMessage());
        }
    }

    public boolean sync(Collection<String> documentIds) {
        for (String documentId : documentIds) {
            Boolean synced = transactionTemplate.execute(status -> syncOne(documentId));
            if (!Boolean.TRUE.equals(synced)) {
                return false;
            }
        }
        return true;
    }

    private void reconcileStale() {
        List<String> stale;
        do {
            stale = documentRepository.findStaleForSearch(PageRequest.of(0, searchProperties.reconcileBatchSize()));
        } while (!stale.isEmpty() && sync(stale));
    }

    private boolean syncOne(String documentId) {
        try {
            ensureIndex();
            long readVersion = ChronoUnit.MICROS.between(Instant.EPOCH, Instant.now());
            Optional<Document> document = documentRepository.findByUuid(documentId);
            if (document.isEmpty() || document.get().isDeleted()) {
                operations.delete(documentId, SearchDocument.class);
                return true;
            }
            Document current = document.get();
            IndexQuery query = new IndexQueryBuilder()
                    .withId(current.getUuid())
                    .withObject(toSearchDocument(current))
                    .withVersion(readVersion)
                    .build();
            operations.index(query, operations.getIndexCoordinatesFor(SearchDocument.class));
            documentRepository.markIndexed(current.getId(), current.getLockVersion());
            return true;
        } catch (DataAccessException e) {
            if (isStaleWrite(e)) {
                return true;
            }
            indexReady.set(false);
            log.warn("Could not sync document {} to the search index: {}", documentId, e.getMessage());
            return false;
        }
    }

    private static boolean isStaleWrite(DataAccessException e) {
        for (Throwable cause = e; cause != null; cause = cause.getCause()) {
            if (cause.getMessage() != null && cause.getMessage().contains("version_conflict_engine_exception")) {
                return true;
            }
        }
        return false;
    }

    private SearchDocument toSearchDocument(Document document) {
        DocumentVersion version = document.getCurrentVersion();
        List<Folder> ancestors = ancestors(document.getFolder());
        return SearchDocument.builder()
                .id(document.getUuid())
                .versionNumber(version == null ? 0 : version.getVersionNumber())
                .title(document.getName())
                .content(content(document, version))
                .folderId(document.getFolder() == null ? null : document.getFolder().getUuid())
                .folderAncestors(ancestors.stream().map(Folder::getUuid).toList())
                .folderPath(folderPath(ancestors))
                .ownerId(document.getOwner().getUuid())
                .allowedPrincipals(allowedPrincipals(document, ancestors))
                .mimeType(version == null ? null : version.getMimeType())
                .size(version == null ? 0 : version.getSize())
                .updatedAt(document.getUpdatedAt() == null ? 0 : document.getUpdatedAt().toInstant().toEpochMilli())
                .build();
    }

    private String content(Document document, DocumentVersion version) {
        if (version == null) {
            return "";
        }
        SearchDocument existing = operations.get(document.getUuid(), SearchDocument.class);
        if (existing != null && existing.getVersionNumber() == version.getVersionNumber()) {
            return existing.getContent();
        }
        return textExtractor.extract(blobStorage.load(version.getBlobKey()), document.getName());
    }

    private List<String> allowedPrincipals(Document document, List<Folder> ancestors) {
        Set<String> principals = new LinkedHashSet<>();
        principals.add(userPrincipal(document.getOwner().getUuid()));
        for (Folder folder : ancestors) {
            principals.add(userPrincipal(folder.getOwner().getUuid()));
            for (FolderPermission permission : permissionRepository.findByFolder(folder)) {
                principals.add(switch (permission.getPrincipalType()) {
                    case USER -> userPrincipal(permission.getPrincipal());
                    case ROLE -> rolePrincipal(permission.getPrincipal());
                });
            }
        }
        return List.copyOf(principals);
    }

    private static String folderPath(List<Folder> ancestors) {
        List<String> names = new ArrayList<>(ancestors.stream().map(Folder::getName).toList());
        Collections.reverse(names);
        return String.join(" / ", names);
    }

    private static List<Folder> ancestors(Folder folder) {
        List<Folder> chain = new ArrayList<>();
        for (Folder current = folder; current != null; current = current.getParent()) {
            chain.add(current);
        }
        return Collections.unmodifiableList(chain);
    }

    private synchronized void ensureIndex() {
        if (indexReady.get()) {
            return;
        }
        IndexOperations index = operations.indexOps(SearchDocument.class);
        if (!index.exists()) {
            try {
                index.createWithMapping();
            } catch (DataAccessException e) {
                if (!index.exists()) {
                    throw e;
                }
            }
        }
        awaitPrimaryShards();
        indexReady.set(true);
    }

    private void awaitPrimaryShards() {
        try {
            HealthResponse health = client.cluster().health(request -> request
                    .index(searchProperties.index())
                    .waitForStatus(HealthStatus.Yellow)
                    .timeout(time -> time.time("30s")));
            if (health.timedOut()) {
                throw new DataAccessResourceFailureException("Search index " + searchProperties.index() + " did not become available");
            }
        } catch (IOException e) {
            throw new DataAccessResourceFailureException("Could not check search index health", e);
        }
    }

    public static String userPrincipal(String userId) {
        return "user:" + userId;
    }

    public static String rolePrincipal(String role) {
        return "role:" + role;
    }
}
