package com.example.fhirexample.utils;

import ca.uhn.fhir.context.FhirContext;
import ca.uhn.fhir.parser.IParser;

import org.hl7.fhir.r4.model.Location;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;

public class LocationResultParser {

    private static final IParser parser = FhirContext.forR4().newJsonParser();

    public static Location parseSingleLocation(ArrayNode rootNode) {
        if(rootNode.size() > 1) {
            throw new RuntimeException("Too many documents returned for a single read");
        }

        Location thisLocation = parser.parseResource(Location.class, rootNode.get(0).toString());
        return thisLocation;
    }

    public static List<Location> parseMultipleLocations(ArrayNode rootNode) {
        List<Location> locations = new ArrayList<Location>();

        for(JsonNode docNode : rootNode) {
            Location thisLocation = parser.parseResource(Location.class, docNode.toString());
            locations.add(thisLocation);
        }

        return locations;
    }
}