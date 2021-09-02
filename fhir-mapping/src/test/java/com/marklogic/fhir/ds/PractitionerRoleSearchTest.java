package com.example.fhirexample;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeAll;

import com.fasterxml.jackson.databind.JsonNode;

import com.marklogic.client.DatabaseClient;
import com.marklogic.client.DatabaseClientFactory;

import com.marklogic.fhir.ds.PractitionerRoleSearch;


class PractitionerRoleSearchTest {

    private static final String host = "localhost";
    private static final int port = 8011;
    private static final String userName = "data-services-example-user";
    private static final String password = "password";

    private static DatabaseClient client = null;

    @BeforeAll
    static void setup() {
        client = DatabaseClientFactory.newClient(host, port, new DatabaseClientFactory.DigestAuthContext(userName, password));
    }

    @Test
    void readGetsCorrectResource() {
        //setup
        String readId = "5c8f5d2b-16f9-4e32-a096-d0ad690cc795-PractitionerRole-1";

        //act
        JsonNode result = PractitionerRoleSearch.on(client).read(readId);

        String resultId = result.get("id").asText();

        //assert
        assertEquals(readId, resultId);

    }

    @Test
    void readGetsCorrectResourceWithNonFirstIndex() {
        //setup
        String readId = "5c8f5d2b-16f9-4e32-a096-d0ad690cc795-PractitionerRole-2";

        //act
        JsonNode result = PractitionerRoleSearch.on(client).read(readId);

        String resultId = result.get("id").asText();

        //assert
        assertEquals(readId, resultId);

    }
}
