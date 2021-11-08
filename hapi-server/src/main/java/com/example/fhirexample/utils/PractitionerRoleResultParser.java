package com.example.fhirexample.utils;

import ca.uhn.fhir.context.FhirContext;
import ca.uhn.fhir.parser.IParser;

import org.hl7.fhir.r4.model.PractitionerRole;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;

public class PractitionerRoleResultParser {

    private static final IParser parser = FhirContext.forR4().newJsonParser();

    public static PractitionerRole parseSinglePractitionerRole(JsonNode rootNode) {
        PractitionerRole thisPractitionerRole = parser.parseResource(PractitionerRole.class, rootNode.toString());
        return thisPractitionerRole;
    }

    public static List<PractitionerRole> parseMultiplePractitionerRoles(ArrayNode rootNode) {
        List<PractitionerRole> practitionerRoles = new ArrayList<PractitionerRole>();

        for(JsonNode docNode : rootNode) {
            PractitionerRole thisPractitionerRole = parser.parseResource(PractitionerRole.class, docNode.toString());
            practitionerRoles.add(thisPractitionerRole);
        }

        return practitionerRoles;
    }
}