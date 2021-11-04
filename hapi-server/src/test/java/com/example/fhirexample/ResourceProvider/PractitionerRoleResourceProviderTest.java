package com.example.fhirexample.ResourceProvider;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeAll;

import com.fasterxml.jackson.databind.JsonNode;

import ca.uhn.fhir.context.FhirContext;
import ca.uhn.fhir.parser.IParser;
import org.hl7.fhir.dstu2.model.IdType;
import org.hl7.fhir.r4.model.PractitionerRole;

import com.marklogic.client.DatabaseClient;
import com.marklogic.client.DatabaseClientFactory;

import com.example.fhirexample.ResourceProvider.PractitionerRoleResourceProvider;


class PractitionerRoleResourceProviderTest {

    private static final String host = "localhost";
    private static final int port = 8011;
    private static final String userName = "data-services-example-user";
    private static final String password = "password";

    private static DatabaseClient client = null;
    private static IParser parser = null;

    private static PractitionerRoleResourceProvider provider = null;

    @BeforeAll
    static void setup() {
        client = DatabaseClientFactory.newClient(host, port, new DatabaseClientFactory.DigestAuthContext(userName, password));
        FhirContext ctx = FhirContext.forR4();
        parser = ctx.newJsonParser();

        provider = new PractitionerRoleResourceProvider(client, parser);
    }

    @Test
    void readGetsCorrectResource() {
        //setup
        String readId = "5c8f5d2b-16f9-4e32-a096-d0ad690cc795-PractitionerRole-1";
        IdType idParam = new IdType(readId);

        //act
        PractitionerRole result = provider.read(idParam);

        String resultId = result.getIdElement().getIdPart();

        //assert
        assertEquals(readId, resultId);

    }

    @Test
    void readGetsCorrectResourceWithNonFirstIndex() {
        //setup
        String readId = "5c8f5d2b-16f9-4e32-a096-d0ad690cc795-PractitionerRole-2";
        IdType idParam = new IdType(readId);

        //act
        PractitionerRole result = provider.read(idParam);

        String resultId = result.getIdElement().getIdPart();

        //assert
        assertEquals(readId, resultId);

    }
}
