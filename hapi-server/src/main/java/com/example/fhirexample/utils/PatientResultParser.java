package com.example.fhirexample.utils;

import ca.uhn.fhir.context.FhirContext;
import ca.uhn.fhir.parser.IParser;

import org.hl7.fhir.r4.model.Patient;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;

public class PatientResultParser {

    private static final IParser parser = FhirContext.forR4().newJsonParser();

    public static Patient parseSinglePatient(ArrayNode rootNode) {
        if(rootNode.size() > 1) {
            throw new RuntimeException("Too many documents returned for a single read");
        }

        Patient thisPatient = parser.parseResource(Patient.class, rootNode.get(0).toString());
        return thisPatient;
    }

    public static List<Patient> parseMultiplePatients(ArrayNode rootNode) {
        List<Patient> patients = new ArrayList<Patient>();

        for(JsonNode docNode : rootNode) {
            Patient thisPatient = parser.parseResource(Patient.class, docNode.toString());
            patients.add(thisPatient);
        }

        return patients;
    }
}