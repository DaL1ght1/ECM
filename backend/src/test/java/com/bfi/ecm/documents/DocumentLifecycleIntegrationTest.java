package com.bfi.ecm.documents;

import com.bfi.ecm.Entities.DocumentVersion;
import com.bfi.ecm.Entities.User;
import com.bfi.ecm.Repository.DocumentRepository;
import com.bfi.ecm.Repository.DocumentVersionRepository;
import com.bfi.ecm.Repository.UserRepository;
import com.bfi.ecm.Services.ServicesImpl.JwtServiceImpl;
import com.bfi.ecm.support.PostgresIntegrationTest;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class DocumentLifecycleIntegrationTest extends PostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentVersionRepository versionRepository;

    @Autowired
    private JwtServiceImpl jwtService;

    private User alice;
    private User bob;

    @BeforeEach
    void createUsers() {
        alice = user("USER");
        bob = user("ENGINEER");
    }

    @Test
    void rejectsAnonymousRequests() throws Exception {
        mockMvc.perform(get("/api/v1/folders")).andExpect(status().isUnauthorized());
    }

    @Test
    void uploadsVersionsRestoresAndDownloads() throws Exception {
        String folderId = createFolder(alice, "Reports");
        MvcResult uploaded = mockMvc.perform(upload(alice, "/api/v1/documents", "report.txt", "first draft")
                        .param("folderId", folderId))
                .andExpect(status().isCreated())
                .andExpect(header().exists(HttpHeaders.ETAG))
                .andExpect(jsonPath("$.name").value("report.txt"))
                .andExpect(jsonPath("$.folderId").value(folderId))
                .andExpect(jsonPath("$.currentVersion.versionNumber").value(1))
                .andExpect(jsonPath("$.currentVersion.mimeType").value("text/plain"))
                .andReturn();
        String documentId = read(uploaded, "$.id");
        String etag = uploaded.getResponse().getHeader(HttpHeaders.ETAG);

        mockMvc.perform(upload(alice, "/api/v1/documents/" + documentId + "/versions", "report.txt", "second draft")
                        .param("comment", "Reviewed")
                        .header(HttpHeaders.IF_MATCH, etag))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentVersion.versionNumber").value(2))
                .andExpect(jsonPath("$.currentVersion.comment").value("Reviewed"));

        mockMvc.perform(upload(alice, "/api/v1/documents/" + documentId + "/versions", "report.txt", "second draft"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentVersion.versionNumber").value(2));

        mockMvc.perform(upload(alice, "/api/v1/documents/" + documentId + "/versions", "report.txt", "stale edit")
                        .header(HttpHeaders.IF_MATCH, etag))
                .andExpect(status().isPreconditionFailed());

        mockMvc.perform(get("/api/v1/documents/" + documentId + "/versions").header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].versionNumber").value(2))
                .andExpect(jsonPath("$[1].versionNumber").value(1));

        mockMvc.perform(post("/api/v1/documents/" + documentId + "/versions/1/restore").header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentVersion.versionNumber").value(3))
                .andExpect(jsonPath("$.currentVersion.comment").value("Restored from version 1"));

        mockMvc.perform(get("/api/v1/documents/" + documentId + "/content").header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(status().isOk())
                .andExpect(content().string("first draft"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("inline")))
                .andExpect(header().string("Content-Security-Policy", "sandbox"));

        mockMvc.perform(get("/api/v1/documents/" + documentId + "/versions/2/content").header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(status().isOk())
                .andExpect(content().string("second draft"));
    }

    @Test
    void sanitizesTraversalFilenames() throws Exception {
        MvcResult uploaded = mockMvc.perform(upload(alice, "/api/v1/documents", "../../escape.txt", "contained"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("escape.txt"))
                .andReturn();

        assertThat(Path.of("escape.txt")).doesNotExist();
        assertThat(Path.of("target", "escape.txt")).doesNotExist();
        mockMvc.perform(get("/api/v1/documents/" + read(uploaded, "$.id") + "/content").header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(content().string("contained"));
    }

    @Test
    void servesActiveContentAsAttachment() throws Exception {
        MvcResult uploaded = mockMvc.perform(upload(alice, "/api/v1/documents", "page.html", "<script>alert(1)</script>"))
                .andExpect(status().isCreated())
                .andReturn();

        mockMvc.perform(get("/api/v1/documents/" + read(uploaded, "$.id") + "/content").header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("attachment")));
    }

    @Test
    void rejectsDuplicateNamesInSameFolder() throws Exception {
        String folderId = createFolder(alice, "Contracts");
        mockMvc.perform(upload(alice, "/api/v1/documents", "contract.txt", "a").param("folderId", folderId))
                .andExpect(status().isCreated());
        mockMvc.perform(upload(alice, "/api/v1/documents", "CONTRACT.txt", "b").param("folderId", folderId))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    @Test
    void enforcesFolderPermissions() throws Exception {
        String folderId = createFolder(alice, "Engineering");
        MvcResult uploaded = mockMvc.perform(upload(alice, "/api/v1/documents", "design-notes.txt", "secret plans").param("folderId", folderId))
                .andExpect(status().isCreated())
                .andReturn();
        String documentId = read(uploaded, "$.id");

        mockMvc.perform(get("/api/v1/documents/" + documentId).header(HttpHeaders.AUTHORIZATION, bearer(bob)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/folders/" + folderId).header(HttpHeaders.AUTHORIZATION, bearer(bob)))
                .andExpect(status().isNotFound());
        mockMvc.perform(put("/api/v1/folders/" + folderId + "/permissions").header(HttpHeaders.AUTHORIZATION, bearer(bob))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"permissions\":[]}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(put("/api/v1/folders/" + folderId + "/permissions").header(HttpHeaders.AUTHORIZATION, bearer(alice))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"permissions\":[{\"principalType\":\"ROLE\",\"principal\":\"ENGINEER\",\"access\":\"READ\"}]}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/documents/" + documentId).header(HttpHeaders.AUTHORIZATION, bearer(bob)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access").value("READ"));
        mockMvc.perform(upload(bob, "/api/v1/documents/" + documentId + "/versions", "design-notes.txt", "vandalism"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/folders/shared").header(HttpHeaders.AUTHORIZATION, bearer(bob)))
                .andExpect(jsonPath("$[*].id", hasItem(folderId)));
        mockMvc.perform(get("/api/v1/search").param("q", "design-notes").header(HttpHeaders.AUTHORIZATION, bearer(bob)))
                .andExpect(jsonPath("$[*].id", hasItem(documentId)));
        mockMvc.perform(get("/api/v1/folders/" + folderId + "/permissions").header(HttpHeaders.AUTHORIZATION, bearer(bob)))
                .andExpect(status().isForbidden());
    }

    @Test
    void trashRestoreAndPurge() throws Exception {
        MvcResult uploaded = mockMvc.perform(upload(alice, "/api/v1/documents", "old-budget.txt", "numbers"))
                .andExpect(status().isCreated())
                .andReturn();
        String documentId = read(uploaded, "$.id");

        mockMvc.perform(delete("/api/v1/documents/" + documentId).header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/v1/documents/" + documentId).header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/trash").header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(jsonPath("$[*].id", hasItem(documentId)));
        mockMvc.perform(delete("/api/v1/trash/" + documentId).header(HttpHeaders.AUTHORIZATION, bearer(bob)))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/v1/trash/" + documentId + "/restore").header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/documents/" + documentId).header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(status().isOk());

        List<Path> blobs = blobPaths(documentId);
        assertThat(blobs).isNotEmpty().allMatch(Files::exists);

        mockMvc.perform(delete("/api/v1/documents/" + documentId).header(HttpHeaders.AUTHORIZATION, bearer(alice)));
        mockMvc.perform(delete("/api/v1/trash/" + documentId).header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(status().isNoContent());

        assertThat(documentRepository.findByUuid(documentId)).isEmpty();
        assertThat(blobs).noneMatch(Files::exists);
    }

    @Test
    void deletingFolderMovesItsDocumentsToTrash() throws Exception {
        String parentId = createFolder(alice, "Archive");
        String childId = createFolder(alice, "2023", parentId);
        MvcResult uploaded = mockMvc.perform(upload(alice, "/api/v1/documents", "q4.txt", "report").param("folderId", childId))
                .andExpect(status().isCreated())
                .andReturn();

        mockMvc.perform(delete("/api/v1/folders/" + parentId).header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/folders/" + childId).header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/trash").header(HttpHeaders.AUTHORIZATION, bearer(alice)))
                .andExpect(jsonPath("$[*].id", hasItem(read(uploaded, "$.id"))));
    }

    private String createFolder(User owner, String name) throws Exception {
        return createFolder(owner, name, null);
    }

    private String createFolder(User owner, String name, String parentId) throws Exception {
        String body = parentId == null
                ? "{\"name\":\"" + name + "\"}"
                : "{\"name\":\"" + name + "\",\"parentId\":\"" + parentId + "\"}";
        MvcResult result = mockMvc.perform(post("/api/v1/folders").header(HttpHeaders.AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();
        return read(result, "$.id");
    }

    private MockMultipartHttpServletRequestBuilder upload(User user, String url, String fileName, String content) {
        MockMultipartHttpServletRequestBuilder request = multipart(url)
                .file(new MockMultipartFile("file", fileName, "text/plain", content.getBytes(StandardCharsets.UTF_8)));
        request.header(HttpHeaders.AUTHORIZATION, bearer(user));
        return request;
    }

    private List<Path> blobPaths(String documentId) {
        var document = documentRepository.findByUuid(documentId).orElseThrow();
        Path root = Path.of("target/test-blobs").toAbsolutePath();
        return versionRepository.findByDocumentOrderByVersionNumberDesc(document).stream()
                .map(DocumentVersion::getBlobKey)
                .map(key -> root.resolve(key.substring(0, 2)).resolve(key.substring(2, 4)).resolve(key))
                .toList();
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

    private static String read(MvcResult result, String path) throws Exception {
        return JsonPath.read(result.getResponse().getContentAsString(), path);
    }
}
