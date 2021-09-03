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
import org.hl7.fhir.r5.model.HumanName;
import org.hl7.fhir.r5.model.Patient;

import java.util.*;
import java.util.stream.Stream;

import static java.util.stream.Collectors.toList;

import com.marklogic.client.DatabaseClient;
import com.marklogic.patient.MLSearch;
import com.fasterxml.jackson.databind.JsonNode;
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
    @Read
    public Patient read(@IdParam IdType theId) {
        Patient patient = new Patient();
        Pagination page = new Pagination(null, null);
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            List<SearchCriteria> searchCriteriaList = List.of(searchCriteria(Patient.SP_RES_ID, theId.getIdPart()));

            JsonNode params = objectMapper.valueToTree(searchCriteriaList);
            JsonNode rootNode = MLSearch.on(thisClient).search(params, page.getOffset(), page.getCount());
            patient = getMLPatient(rootNode);
        } catch (Exception ex) {
            throw new ResourceNotFoundException(ex.getMessage());
        }
        return patient;
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
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            JsonNode params = objectMapper.valueToTree(searchTerms);
            System.out.println("PARAMS:" + params.toString());
            JsonNode rootNode = MLSearch.on(thisClient).search(params, page.getOffset(), page.getCount());
            patients = getMLPatients(rootNode);
        } catch (Exception ex) {
            throw new ResourceNotFoundException(ex.getMessage());
        }
        return patients;
    }

    private Patient getMLPatient(JsonNode rootNode) {
        Patient thisPatient = null;
        if (rootNode != null) {
            Iterator<Map.Entry<String, JsonNode>> fieldsIterator = rootNode.fields();
            JsonNode docNode = null;
            while (fieldsIterator.hasNext()) {
                Map.Entry<String, JsonNode> field = fieldsIterator.next();
                System.out.println("docSize:" + field.getValue().size());
                for (int i = 0; i < field.getValue().size(); i++) {
                    docNode = field.getValue().get(i);
                    if (docNode != null && docNode.isContainerNode()) {
                        // Parse it
                        thisPatient = thisParser.parseResource(Patient.class, docNode.toString());
                    }
                    if (thisPatient != null) {
                        System.out.println(thisPatient.getId());
                        List<HumanName> hnList = thisPatient.getName();
                        Iterator<HumanName> it = hnList.iterator();
                        while (it.hasNext()) {
                            HumanName obj = (HumanName) it.next();
                            System.out.println(obj.getGiven());
                        }
                    }
                }
            }
        }
        return thisPatient;
    }

    private List<Patient> getMLPatients(JsonNode rootNode) {
        List<Patient> patients = new ArrayList<Patient>();
        Patient thisPatient = null;
        if (rootNode != null) {
            Iterator<Map.Entry<String, JsonNode>> fieldsIterator = rootNode.fields();
            JsonNode docNode = null;
            while (fieldsIterator.hasNext()) {
                Map.Entry<String, JsonNode> field = fieldsIterator.next();
                System.out.println("docSize:" + field.getValue().size());
                for (int i = 0; i < field.getValue().size(); i++) {
                    docNode = field.getValue().get(i);
                    if (docNode != null && docNode.isContainerNode()) {
                        // Parse it
                        thisPatient = thisParser.parseResource(Patient.class, docNode.toString());
                        patients.add(thisPatient);
                    }
                    if (!patients.isEmpty()) {
                        System.out.println(thisPatient.getId());
                        List<HumanName> hnList = thisPatient.getName();
                        Iterator<HumanName> it = hnList.iterator();
                        while (it.hasNext()) {
                            HumanName obj = (HumanName) it.next();
                            System.out.println(obj.getGiven());
                        }
                    }
                }
            }
        }
        return patients;
    }
}
