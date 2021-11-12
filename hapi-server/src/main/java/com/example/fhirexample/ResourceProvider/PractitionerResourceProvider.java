package com.example.fhirexample.ResourceProvider;

import ca.uhn.fhir.parser.IParser;
import ca.uhn.fhir.rest.annotation.IdParam;
import ca.uhn.fhir.rest.annotation.Read;
import ca.uhn.fhir.rest.annotation.RequiredParam;
import ca.uhn.fhir.rest.annotation.OptionalParam;
import ca.uhn.fhir.rest.annotation.Search;
import ca.uhn.fhir.rest.annotation.Count;
import ca.uhn.fhir.rest.annotation.IncludeParam;
import ca.uhn.fhir.rest.annotation.Offset;

import ca.uhn.fhir.model.api.Include;
import ca.uhn.fhir.rest.param.StringParam;
import ca.uhn.fhir.rest.param.TokenAndListParam;
import ca.uhn.fhir.rest.param.TokenOrListParam;
import ca.uhn.fhir.rest.param.StringOrListParam;
import ca.uhn.fhir.rest.param.StringAndListParam;
import ca.uhn.fhir.rest.server.IResourceProvider;
import ca.uhn.fhir.rest.server.exceptions.ResourceNotFoundException;
import org.hl7.fhir.dstu2.model.IdType;
import org.hl7.fhir.instance.model.api.IBaseResource;
import org.hl7.fhir.r4.model.HumanName;
import org.hl7.fhir.r4.model.Practitioner;
import org.hl7.fhir.r4.model.PractitionerRole;
import org.hl7.fhir.r4.model.DomainResource;

import java.util.*;
import static java.util.stream.Collectors.toList;

import com.marklogic.client.DatabaseClient;
import com.marklogic.fhir.ds.PractitionerSearch;
import com.example.fhirexample.utils.PractitionerResultParser;
import com.example.fhirexample.utils.PractitionerRoleResultParser;
import com.marklogic.fhir.ds.PractitionerRoleSearch;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.marklogic.util.SearchCriteria;
import com.marklogic.util.Pagination;
import static com.marklogic.util.SearchCriteria.searchCriteria;

public class PractitionerResourceProvider implements IResourceProvider {
    /**
     * Constructor
     */
    DatabaseClient thisClient;
    IParser thisParser;
    public PractitionerResourceProvider(DatabaseClient client, IParser parser) {
        thisClient = client;
        thisParser = parser;
    }

    /* You want to be a law abiding class so please
     Implement abstract method getResourceProvider() from IResourceProvider
     */

    @Override

    public Class<? extends IBaseResource> getResourceType() {
        return Practitioner.class;
    }
    /**
     * The "@Search" annotation indicates that this method supports the
     * search operation. Similarly we can have more Search annotations defined
     * they can each take different parameters
     * Documentation just gets added to your Capability Statement
     *
     * @param theParam
     *    This operation takes one parameter which is the search criteria. It is
     *    annotated with the "@Required" annotation. This annotation takes one argument,
     *    a string containing the name of the search criteria. The datatype here
     *    is StringParam, but there are other possible parameter types depending on the
     *    specific search criteria.
     *    There is a "@Optional" tag which can be used if you want to have a search criteria as optional
     * @return
     *    This method returns a list of Patients. This list may contain multiple
     *    matching resources, or it may also be empty.
     *    This annotation takes a "name" parameter which specifies the parameter's name (as it will appear in the search URL).
     *    FHIR defines standardized parameter names for each resource, and these are available as constants on the individual
     *    HAPI resource classes.
     */

    @Search
    public List<DomainResource> getAllPractitioners(@Offset Integer theOffset,
                                                  @Count Integer theCount,
                                                  @IncludeParam(reverse=true, allow={"PractitionerRole:practitioner"}) Set<Include> theReverseIncludes) {
        List<DomainResource> results = new ArrayList<>();
        Pagination page = new Pagination(theOffset, theCount);
        try {
            ArrayNode rootNode = PractitionerSearch.on(thisClient).search(null, page.getOffset(), page.getCount());
            List<Practitioner> practitioners = PractitionerResultParser.parseMultiplePractitioners(rootNode);

            results.addAll(practitioners);
            if (theReverseIncludes.contains(new Include("PractitionerRole:practitioner"))) {
                List<PractitionerRole> practitionerRoles = getPractitionerRoleRevInclude(practitioners);    
                results.addAll(practitionerRoles);
            }
        } catch (Exception ex) {
            throw new ResourceNotFoundException(ex.getMessage());
        }
        return results;
    }

    @Search
    public List<DomainResource> findPractitionersByIdentifier(
            @RequiredParam(name=Practitioner.SP_IDENTIFIER) TokenAndListParam theParam,
            @Offset Integer theOffset,
            @Count Integer theCount,
            @IncludeParam(reverse=true, allow={"PractitionerRole:practitioner"}) Set<Include> theReverseIncludes) {
        List<DomainResource> results = new ArrayList<>();
        Pagination page = new Pagination(theOffset, theCount);
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            List<SearchCriteria> searchCriteriaList = searchCriteria(Practitioner.SP_IDENTIFIER, theParam);

            JsonNode params = objectMapper.valueToTree(searchCriteriaList);
            ArrayNode rootNode = PractitionerSearch.on(thisClient).search(params, page.getOffset(), page.getCount());
            List<Practitioner> practitioners = PractitionerResultParser.parseMultiplePractitioners(rootNode);

            results.addAll(practitioners);
            if (theReverseIncludes.contains(new Include("PractitionerRole:practitioner"))) {
                List<PractitionerRole> practitionerRoles = getPractitionerRoleRevInclude(practitioners);    
                results.addAll(practitionerRoles);
            }
        } catch (Exception ex) {
            throw new ResourceNotFoundException(ex.getMessage());
        }
        return results;
    }

    @Search
    public List<DomainResource> findPractitionersByName(
            @RequiredParam(name=Practitioner.SP_NAME) StringAndListParam theParam,
            @Offset Integer theOffset,
            @Count Integer theCount,
            @IncludeParam(reverse=true, allow={"PractitionerRole:practitioner"}) Set<Include> theReverseIncludes) {
        List<DomainResource> results = new ArrayList<>();
        Pagination page = new Pagination(theOffset, theCount);
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            List<SearchCriteria> searchCriteriaList = searchCriteria(Practitioner.SP_NAME, theParam);

            JsonNode params = objectMapper.valueToTree(searchCriteriaList);
            ArrayNode rootNode = PractitionerSearch.on(thisClient).search(params, page.getOffset(), page.getCount());
            List<Practitioner> practitioners = PractitionerResultParser.parseMultiplePractitioners(rootNode);

            results.addAll(practitioners);
            if (theReverseIncludes.contains(new Include("PractitionerRole:practitioner"))) {
                List<PractitionerRole> practitionerRoles = getPractitionerRoleRevInclude(practitioners);    
                results.addAll(practitionerRoles);
            }
        } catch (Exception ex) {
            throw new ResourceNotFoundException(ex.getMessage());
        }
        return results;
    }

    /**
     * Simple implementation of the "read" method
     * The "@Read" annotation indicates that this method supports the
     *     * read operation. Read operations should return a single resource
     *     * instance.
     *
     * This method will support a query like this http://localhost:8080/Patient/1
     */
    @Read(version=true)
    public Practitioner read(@IdParam IdType theId) {
        Pagination page = new Pagination(null, null);
        
        ObjectMapper objectMapper = new ObjectMapper();
        List<SearchCriteria> searchCriteriaList = new ArrayList<SearchCriteria>();

        searchCriteriaList.addAll(List.of(searchCriteria(Practitioner.SP_RES_ID, theId.getIdPart())));
        if(theId.hasVersionIdPart()) {
            searchCriteriaList.addAll(List.of(searchCriteria("_version", theId.getVersionIdPart())));
        }

        JsonNode params = objectMapper.valueToTree(searchCriteriaList);
        ArrayNode rootNode = PractitionerSearch.on(thisClient).search(params, page.getOffset(), page.getCount());
        Practitioner retPractitioner = PractitionerResultParser.parseSinglePractitioner(rootNode);

        return retPractitioner;
    }

    @Search
    public List<DomainResource> findPractitionersByGiven(
            @RequiredParam(name=Practitioner.SP_GIVEN) StringAndListParam paramValues,
            @Offset Integer theOffset,
            @Count Integer theCount,
            @IncludeParam(reverse=true, allow={"PractitionerRole:practitioner"}) Set<Include> theReverseIncludes) {
        List<DomainResource> results = new ArrayList<>();
        Pagination page = new Pagination(theOffset, theCount);
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            List<SearchCriteria> searchCriteriaList = searchCriteria(Practitioner.SP_GIVEN, paramValues);

            JsonNode params = objectMapper.valueToTree(searchCriteriaList);
            ArrayNode rootNode = PractitionerSearch.on(thisClient).search(params, page.getOffset(), page.getCount());
            List<Practitioner> practitioners = PractitionerResultParser.parseMultiplePractitioners(rootNode);

            results.addAll(practitioners);
            if (theReverseIncludes.contains(new Include("PractitionerRole:practitioner"))) {
                List<PractitionerRole> practitionerRoles = getPractitionerRoleRevInclude(practitioners);    
                results.addAll(practitionerRoles);
            }

        } catch (Exception ex) {
            throw new ResourceNotFoundException(ex.getMessage());
        }
        return results;
    }

    @Search
    public List<DomainResource> findPractitionersByFamily(
            @RequiredParam(name=Practitioner.SP_FAMILY) StringAndListParam paramValues,
            @Offset Integer theOffset,
            @Count Integer theCount,
            @IncludeParam(reverse=true, allow={"PractitionerRole:practitioner"}) Set<Include> theReverseIncludes) {
        List<DomainResource> results = new ArrayList<>();
        Pagination page = new Pagination(theOffset, theCount);
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            List<SearchCriteria> searchCriteriaList = searchCriteria(Practitioner.SP_FAMILY, paramValues);

            JsonNode params = objectMapper.valueToTree(searchCriteriaList);
            System.out.println("PARAMS:" + params.toString());
            ArrayNode rootNode = PractitionerSearch.on(thisClient).search(params, page.getOffset(), page.getCount());
            List<Practitioner> practitioners = PractitionerResultParser.parseMultiplePractitioners(rootNode);

            results.addAll(practitioners);
            if (theReverseIncludes.contains(new Include("PractitionerRole:practitioner"))) {
                List<PractitionerRole> practitionerRoles = getPractitionerRoleRevInclude(practitioners);    
                results.addAll(practitionerRoles);
            }
        } catch (Exception ex) {
            throw new ResourceNotFoundException(ex.getMessage());
        }
        return results;
    }

    @Search
    public List<DomainResource> findPractitionersByResIdentifier(
            @RequiredParam(name=Practitioner.SP_RES_ID) TokenOrListParam theParam,
            @Offset Integer theOffset,
            @Count Integer theCount,
            @IncludeParam(reverse=true, allow={"PractitionerRole:practitioner"}) Set<Include> theReverseIncludes) {
        List<DomainResource> results = new ArrayList<>();
        Pagination page = new Pagination(theOffset, theCount);
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            List<SearchCriteria> searchCriteriaList = List.of(searchCriteria(Practitioner.SP_RES_ID, theParam));

            JsonNode params = objectMapper.valueToTree(searchCriteriaList);
            ArrayNode rootNode = PractitionerSearch.on(thisClient).search(params, page.getOffset(), page.getCount());
            List<Practitioner> practitioners = PractitionerResultParser.parseMultiplePractitioners(rootNode);

            results.addAll(practitioners);
            if (theReverseIncludes.contains(new Include("PractitionerRole:practitioner"))) {
                List<PractitionerRole> practitionerRoles = getPractitionerRoleRevInclude(practitioners);    
                results.addAll(practitionerRoles);
            }
        } catch (Exception ex) {
            throw new ResourceNotFoundException(ex.getMessage());
        }
        return results;
    }

    private List<PractitionerRole> getPractitionerRoleRevInclude(List<Practitioner> practitionerResults) {

        List<String> pids = new ArrayList<>();

        for(Practitioner current : practitionerResults) {
            pids.add(current.getIdElement().getIdPart());
        }

        List<SearchCriteria> searchCriteriaList = List.of(searchCriteria(PractitionerRole.SP_PRACTITIONER, pids));

        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode params = objectMapper.valueToTree(searchCriteriaList);

        System.out.println(params);

		ArrayNode rootNode = PractitionerRoleSearch.on(thisClient).search(params, 1, 20);

        return PractitionerRoleResultParser.parseMultiplePractitionerRoles(rootNode);
    }
}
