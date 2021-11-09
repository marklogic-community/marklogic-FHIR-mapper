package com.example.fhirexample.utils;

import ca.uhn.fhir.context.FhirContext;
import ca.uhn.fhir.parser.IParser;

import org.hl7.fhir.r4.model.Practitioner;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;

public class PractitionerResultParser {

    private static final IParser parser = FhirContext.forR4().newJsonParser();

    public static Practitioner parseSinglePractitioner(ArrayNode rootNode) {
        if(rootNode.size() > 1) {
            throw new RuntimeException("Too many documents returned for a single read");
        }

        Practitioner thisPractitioner = parser.parseResource(Practitioner.class, rootNode.get(0).toString());
        return thisPractitioner;
    }

    public static List<Practitioner> parseMultiplePractitioners(ArrayNode rootNode) {
        List<Practitioner> Practitioners = new ArrayList<Practitioner>();

        for(JsonNode docNode : rootNode) {
            Practitioner thisPractitioner = parser.parseResource(Practitioner.class, docNode.toString());
            Practitioners.add(thisPractitioner);
        }

        return Practitioners;
    }
}