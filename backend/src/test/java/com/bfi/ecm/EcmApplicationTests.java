package com.bfi.ecm;

import com.bfi.ecm.support.PostgresIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "ecm.search.indexing-enabled=false")
class EcmApplicationTests extends PostgresIntegrationTest {

    @Test
    void contextLoads() {
    }

}
