package com.example.fhirexample.ResourceProvider;

import static com.marklogic.util.SearchCriteria.searchCriteria;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import com.example.fhirexample.utils.PractitionerResultParser;
import com.example.fhirexample.utils.PractitionerRoleResultParser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.marklogic.client.DatabaseClient;
import com.marklogic.fhir.ds.PractitionerRoleSearch;
import com.marklogic.fhir.ds.PractitionerSearch;
import com.marklogic.util.Pagination;
import com.marklogic.util.SearchCriteria;

import org.hl7.fhir.dstu2.model.IdType;
import org.hl7.fhir.instance.model.api.IBaseResource;
import org.hl7.fhir.r4.model.DomainResource;
import org.hl7.fhir.r4.model.Practitioner;
import org.hl7.fhir.r4.model.PractitionerRole;

import ca.uhn.fhir.model.api.Include;
import ca.uhn.fhir.parser.IParser;
import ca.uhn.fhir.rest.annotation.Count;
import ca.uhn.fhir.rest.annotation.IdParam;
import ca.uhn.fhir.rest.annotation.IncludeParam;
import ca.uhn.fhir.rest.annotation.Offset;
import ca.uhn.fhir.rest.annotation.OptionalParam;
import ca.uhn.fhir.rest.annotation.Read;
import ca.uhn.fhir.rest.annotation.Search;
import ca.uhn.fhir.rest.api.Constants;
import ca.uhn.fhir.rest.param.DateRangeParam;
import ca.uhn.fhir.rest.param.StringAndListParam;
import ca.uhn.fhir.rest.param.TokenAndListParam;
import ca.uhn.fhir.rest.param.TokenOrListParam;
import ca.uhn.fhir.rest.server.IResourceProvider;
import ca.uhn.fhir.rest.server.exceptions.ResourceNotFoundException;

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
    public List<DomainResource> search(
        @OptionalParam(name = Practitioner.SP_RES_ID) TokenAndListParam id,
        @OptionalParam(name = Practitioner.SP_IDENTIFIER) TokenAndListParam identifier,
        @OptionalParam(name = Practitioner.SP_FAMILY) StringAndListParam family,
        @OptionalParam(name = Practitioner.SP_NAME) StringAndListParam name,
        @OptionalParam(name = Practitioner.SP_GIVEN) StringAndListParam given,
        @OptionalParam(name = Constants.PARAM_LASTUPDATED) DateRangeParam lastUpdated,
        @Offset Integer offset,
        @Count Integer count,
        @IncludeParam(reverse = true, allow={"PractitionerRole:practitioner"}) Set<Include> reverseIncludes
    ) {
        List<DomainResource> results = new ArrayList<DomainResource>();
        Pagination page = new Pagination(offset, count);

        try {
            List<SearchCriteria> searchTerms = new ArrayList<SearchCriteria>();
            searchTerms.addAll(searchCriteria(Practitioner.SP_RES_ID, id));
            searchTerms.addAll(searchCriteria(Practitioner.SP_IDENTIFIER, identifier));
            searchTerms.addAll(searchCriteria(Practitioner.SP_FAMILY, family));
            searchTerms.addAll(searchCriteria(Practitioner.SP_NAME, name));
            searchTerms.addAll(searchCriteria(Practitioner.SP_GIVEN, given));
            searchTerms.addAll(searchCriteria(Constants.PARAM_LASTUPDATED, lastUpdated));

            ObjectMapper objectMapper = new ObjectMapper();
            JsonNode params = objectMapper.valueToTree(searchTerms);

            ArrayNode rootNode = PractitionerSearch.on(thisClient).search(params, page.getOffset(), page.getCount());
            List<Practitioner> practitioners = PractitionerResultParser.parseMultiplePractitioners(rootNode);

            results.addAll(practitioners);
            if (reverseIncludes.contains(new Include("PractitionerRole:practitioner"))) {
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
