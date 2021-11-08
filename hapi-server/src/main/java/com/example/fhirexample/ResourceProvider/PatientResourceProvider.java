package com.example.fhirexample.ResourceProvider;

import ca.uhn.fhir.parser.IParser;
import ca.uhn.fhir.rest.annotation.IdParam;
import ca.uhn.fhir.rest.annotation.Read;
import ca.uhn.fhir.rest.annotation.RequiredParam;
import ca.uhn.fhir.rest.annotation.OptionalParam;
import ca.uhn.fhir.rest.annotation.IncludeParam;
import ca.uhn.fhir.rest.annotation.Search;
import ca.uhn.fhir.rest.annotation.Count;
import ca.uhn.fhir.rest.annotation.Offset;
import ca.uhn.fhir.rest.api.Constants;

import ca.uhn.fhir.rest.api.Constants;
import ca.uhn.fhir.rest.param.DateRangeParam;
import ca.uhn.fhir.rest.param.StringAndListParam;
import ca.uhn.fhir.rest.param.TokenAndListParam;
import ca.uhn.fhir.rest.server.IResourceProvider;
import ca.uhn.fhir.rest.server.exceptions.ResourceNotFoundException;

import org.hl7.fhir.dstu2.model.IdType;
import org.hl7.fhir.instance.model.api.IBaseResource;
import org.hl7.fhir.r4.model.HumanName;
import org.hl7.fhir.r4.model.Patient;

import java.util.*;
import java.util.stream.Stream;

import static java.util.stream.Collectors.toList;

import com.marklogic.client.DatabaseClient;
import com.marklogic.fhir.ds.PatientSearch;
import com.example.fhirexample.utils.PatientResultParser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.marklogic.util.Pagination;
import com.marklogic.util.SearchCriteria;
import static com.marklogic.util.SearchCriteria.searchCriteria;

public class PatientResourceProvider implements IResourceProvider {
    /**
     * Constructor
     */
    DatabaseClient thisClient;
    IParser thisParser;
    public PatientResourceProvider(DatabaseClient client, IParser parser) {
        thisClient = client;
        thisParser = parser;
    }

    /* You want to be a law abiding class so please
     Implement abstract method getResourceProvider() from IResourceProvider
     */

    @Override

    public Class<? extends IBaseResource> getResourceType() {
        return Patient.class;
    }

    /**
     * Simple implementation of the "read" method The "@Read" annotation indicates
     * that this method supports the * read operation. Read operations should return
     * a single resource * instance.
     *
     * This method will support a query like this http://localhost:8080/Patient/1
     */
    @Read(version=true)
    public Patient read(@IdParam IdType theId) {
        Pagination page = new Pagination(null, null);
        
        ObjectMapper objectMapper = new ObjectMapper();
        List<SearchCriteria> searchCriteriaList = new ArrayList<SearchCriteria>();

        searchCriteriaList.addAll(List.of(searchCriteria(Patient.SP_RES_ID, theId.getIdPart())));
        if(theId.hasVersionIdPart()) {
            searchCriteriaList.addAll(List.of(searchCriteria("_version", theId.getVersionIdPart())));
        }

        JsonNode params = objectMapper.valueToTree(searchCriteriaList);
        ArrayNode rootNode = PatientSearch.on(thisClient).search(params, page.getOffset(), page.getCount());
        Patient retPatient = PatientResultParser.parseSinglePatient(rootNode);

        return retPatient;
    }

    @Search
    public List<Patient> search(
            @OptionalParam(name = Patient.SP_RES_ID) StringAndListParam id,
            @OptionalParam(name = Patient.SP_IDENTIFIER) TokenAndListParam identifier,
            @OptionalParam(name = Patient.SP_FAMILY) StringAndListParam family,
            @OptionalParam(name = Patient.SP_GIVEN) StringAndListParam given,
            @OptionalParam(name = Patient.SP_NAME) StringAndListParam name,
            @OptionalParam(name = Patient.SP_GENDER) StringAndListParam gender,
            @OptionalParam(name = Patient.SP_ADDRESS_CITY) StringAndListParam city,
            @OptionalParam(name = Patient.SP_ADDRESS_STATE) StringAndListParam state,
            @OptionalParam(name = Patient.SP_ADDRESS_POSTALCODE) StringAndListParam zip,
            @OptionalParam(name = Patient.SP_BIRTHDATE) DateRangeParam birthdate,
            @OptionalParam(name = Constants.PARAM_LASTUPDATED) DateRangeParam lastUpdated,
            @Offset Integer offset,
            @Count Integer count) {
        List<Patient> patients = new ArrayList<Patient>();
        Pagination page = new Pagination(offset, count);

        List<SearchCriteria> searchTerms = new ArrayList<SearchCriteria>();
        searchTerms.addAll(searchCriteria(Patient.SP_RES_ID, id));
        searchTerms.addAll(searchCriteria(Patient.SP_IDENTIFIER, identifier));
        searchTerms.addAll(searchCriteria(Patient.SP_FAMILY, family));
        searchTerms.addAll(searchCriteria(Patient.SP_GIVEN, given));
        searchTerms.addAll(searchCriteria(Patient.SP_NAME, name));
        searchTerms.addAll(searchCriteria(Patient.SP_GENDER, gender));
        searchTerms.addAll(searchCriteria(Patient.SP_ADDRESS_CITY, city));
        searchTerms.addAll(searchCriteria(Patient.SP_ADDRESS_STATE, state));
        searchTerms.addAll(searchCriteria(Patient.SP_ADDRESS_POSTALCODE, zip));
        searchTerms.addAll(searchCriteria(Patient.SP_BIRTHDATE, birthdate));
        searchTerms.addAll(searchCriteria(Constants.PARAM_LASTUPDATED, lastUpdated));
        
        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode params = objectMapper.valueToTree(searchTerms);
        
        ArrayNode rootNode = PatientSearch.on(thisClient).search(params, page.getOffset(), page.getCount());
        patients = PatientResultParser.parseMultiplePatients(rootNode);

        return patients;
    }
}
