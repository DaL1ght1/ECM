package com.bfi.ecm.search;

import com.bfi.ecm.Entities.SearchDocument;
import com.bfi.ecm.Entities.User;
import com.bfi.ecm.Repository.DocumentRepository;
import com.bfi.ecm.Repository.UserRepository;
import com.bfi.ecm.Services.ServicesImpl.JwtServiceImpl;
import com.bfi.ecm.support.PostgresIntegrationTest;
import com.jayway.jsonpath.JsonPath;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.function.Predicate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@EnabledIfEnvironmentVariable(named = "ECM_TEST_ELASTICSEARCH_URIS", matches = ".+")
@SpringBootTest(properties = {
        "ecm.search.reconcile-initial-delay=PT1S",
        "ecm.search.reconcile-interval=PT2S"
})
@AutoConfigureMockMvc
class SearchIntegrationTest extends PostgresIntegrationTest {

    private static final Duration TIMEOUT = Duration.ofSeconds(20);
    private static final String INDEX = "ecm-documents-test-" + UUID.randomUUID();
    private static ElasticsearchOperations indexCleanup;

    @DynamicPropertySource
    static void elasticsearchProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.elasticsearch.uris", () -> System.getenv("ECM_TEST_ELASTICSEARCH_URIS"));
        registry.add("ecm.search.index", () -> INDEX);
    }

    @AfterAll
    static void deleteIndex() {
        if (indexCleanup != null) {
            indexCleanup.indexOps(SearchDocument.class).delete();
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private JwtServiceImpl jwtService;

    @Autowired
    private ElasticsearchOperations operations;

    private User alice;
    private User bob;

    @BeforeEach
    void setUp() {
        indexCleanup = operations;
        alice = user("USER");
        bob = user("ENGINEER");
    }

    @Test
    void matchesFrenchTextIgnoringAccentsPluralsAndTypos() throws Exception {
        String id = upload(alice, "contrat-maintenance.txt", "text/plain",
                "Le contrat de maintenance annuel a été signé par l'équipe technique.".getBytes(StandardCharsets.UTF_8), null);

        String hits = awaitSearch(alice, "equipes", json -> ids(json).contains(id));
        assertThat(JsonPath.<List<String>>read(hits, "$.hits[0].highlights.content")).anyMatch(fragment -> fragment.contains("<mark>l&#x27;équipe</mark>"));

        awaitSearch(alice, "maintenence", json -> ids(json).contains(id));
        awaitSearch(alice, "signe", json -> ids(json).contains(id));
    }

    @Test
    void indexesTextExtractedFromPdf() throws Exception {
        String id = upload(alice, "rapport-trimestriel.pdf", "application/pdf", pdf("Rapport financier trimestriel du groupe"), null);

        String hits = awaitSearch(alice, "financier", json -> ids(json).contains(id));
        assertThat(JsonPath.<String>read(hits, "$.hits[0].document.currentVersion.mimeType")).isEqualTo("application/pdf");
        assertThat(JsonPath.<List<String>>read(hits, "$.facets.mimeType[*].value")).contains("application/pdf");
    }

    @Test
    void onlyReturnsDocumentsTheUserMayRead() throws Exception {
        String folderId = createFolder(alice, "Produit-" + UUID.randomUUID());
        String id = upload(alice, "feuille-de-route.txt", "text/plain",
                "Feuille de route confidentielle du produit".getBytes(StandardCharsets.UTF_8), folderId);
        awaitSearch(alice, "confidentielle", json -> ids(json).contains(id));

        assertThat(ids(search(bob, "confidentielle"))).doesNotContain(id);

        mockMvc.perform(put("/api/v1/folders/" + folderId + "/permissions").header(HttpHeaders.AUTHORIZATION, bearer(alice))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"permissions\":[{\"principalType\":\"ROLE\",\"principal\":\"ENGINEER\",\"access\":\"READ\"}]}"))
                .andExpect(status().isOk());

        String hits = awaitSearch(bob, "confidentielle", json -> ids(json).contains(id));
        assertThat(JsonPath.<List<String>>read(hits, "$.facets.folder[*].value")).contains(folderId);
    }

    @Test
    void reflectsNewVersionsAndDeletions() throws Exception {
        String id = upload(alice, "notes-reunion.txt", "text/plain", "ordre du jour: budget xylophone".getBytes(StandardCharsets.UTF_8), null);
        awaitSearch(alice, "xylophone", json -> ids(json).contains(id));

        mockMvc.perform(multipart("/api/v1/documents/" + id + "/versions")
                        .file(new MockMultipartFile("file", "notes-reunion.txt", "text/plain", "ordre du jour: recrutement zeppelin".getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(status().isOk());
        awaitSearch(alice, "zeppelin", json -> ids(json).contains(id));
        awaitSearch(alice, "xylophone", json -> !ids(json).contains(id));

        var document = documentRepository.findByUuid(id).orElseThrow();
        assertThat(document.getSearchIndexedVersion()).isEqualTo(document.getLockVersion());

        mockMvc.perform(delete("/api/v1/documents/" + id).header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(status().isNoContent());
        awaitSearch(alice, "zeppelin", json -> !ids(json).contains(id));
        assertThat(operations.get(id, SearchDocument.class)).isNull();
    }

    private String awaitSearch(User user, String query, Predicate<String> condition) throws Exception {
        Instant deadline = Instant.now().plus(TIMEOUT);
        String last;
        do {
            last = searchAllowingStartup(user, query);
            if (condition.test(last)) {
                return last;
            }
            Thread.sleep(250);
        } while (Instant.now().isBefore(deadline));
        throw new AssertionError("Search for \"" + query + "\" never matched; last response: " + last);
    }

    private String search(User user, String query) throws Exception {
        return mockMvc.perform(get("/api/v1/search").param("q", query).header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
    }

    private String searchAllowingStartup(User user, String query) throws Exception {
        var response = mockMvc.perform(get("/api/v1/search").param("q", query).header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andReturn().getResponse();
        if (response.getStatus() == 503) {
            return "{\"hits\":[]}";
        }
        assertThat(response.getStatus()).isEqualTo(200);
        return response.getContentAsString(StandardCharsets.UTF_8);
    }

    private static List<String> ids(String json) {
        return JsonPath.read(json, "$.hits[*].document.id");
    }

    private String upload(User user, String fileName, String contentType, byte[] content, String folderId) throws Exception {
        var request = multipart("/api/v1/documents")
                .file(new MockMultipartFile("file", fileName, contentType, content))
                .header(HttpHeaders.AUTHORIZATION, bearer(user));
        if (folderId != null) {
            request.param("folderId", folderId);
        }
        MvcResult result = mockMvc.perform(request).andExpect(status().isCreated()).andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.id");
    }

    private String createFolder(User owner, String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/folders").header(HttpHeaders.AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.id");
    }

    private static byte[] pdf(String text) throws Exception {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream stream = new PDPageContentStream(document, page)) {
                stream.beginText();
                stream.setFont(PDType1Font.HELVETICA, 14);
                stream.newLineAtOffset(72, 700);
                stream.showText(text);
                stream.endText();
            }
            document.save(out);
            return out.toByteArray();
        }
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateAccessToken(user);
    }

    private User user(String role) {
        return userRepository.save(User.builder()
                .email(UUID.randomUUID() + "@ecm.test")
                .name("Test")
                .lastName(role)
                .password("unused")
                .role(role)
                .enabled(true)
                .build());
    }
}
