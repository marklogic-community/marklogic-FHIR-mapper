package com.example.fhirexample.ResourceProvider;

import ca.uhn.fhir.parser.IParser;
import ca.uhn.fhir.rest.annotation.IdParam;
import ca.uhn.fhir.rest.annotation.Read;
import ca.uhn.fhir.rest.annotation.OptionalParam;
import ca.uhn.fhir.rest.annotation.Search;
import ca.uhn.fhir.rest.annotation.Count;
import ca.uhn.fhir.rest.annotation.IncludeParam;
import ca.uhn.fhir.rest.annotation.Offset;

import ca.uhn.fhir.model.api.Include;
import ca.uhn.fhir.rest.param.StringAndListParam;
import ca.uhn.fhir.rest.server.IResourceProvider;
import ca.uhn.fhir.rest.server.exceptions.ResourceNotFoundException;
import org.hl7.fhir.dstu2.model.IdType;
import org.hl7.fhir.instance.model.api.IBaseResource;
import org.hl7.fhir.r4.model.HumanName;
import org.hl7.fhir.r4.model.Location;
import org.hl7.fhir.r4.model.Practitioner;
import org.hl7.fhir.r4.model.PractitionerRole;
import org.hl7.fhir.r4.model.DomainResource;
import org.hl7.fhir.r4.model.Reference;

import java.util.*;

import com.marklogic.client.DatabaseClient;
import com.marklogic.fhir.ds.PractitionerSearch;
import com.example.fhirexample.utils.PractitionerResultParser;
import com.example.fhirexample.utils.PractitionerRoleResultParser;
import com.marklogic.fhir.ds.LocationSearch;
import com.marklogic.fhir.ds.PractitionerRoleSearch;
import com.example.fhirexample.utils.LocationResultParser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.marklogic.util.SearchCriteria;
import com.marklogic.util.Pagination;
import static com.marklogic.util.SearchCriteria.searchCriteria;

public class PractitionerRoleResourceProvider implements IResourceProvider {

    DatabaseClient thisClient;
    IParser thisParser;

    public PractitionerRoleResourceProvider(DatabaseClient client, IParser parser) {
        thisClient = client;
        thisParser = parser;
    }

    @Override
    public Class<? extends IBaseResource> getResourceType() {
        return PractitionerRole.class;
    }

    @Read
    public PractitionerRole read(@IdParam IdType id) {
        // get the id part to search on
        String idPart = id.getIdPart();
    

        // perform the search
        JsonNode rootNode = PractitionerRoleSearch.on(thisClient).read(idPart);

        // parse the result
        PractitionerRole result = PractitionerRoleResultParser.parseSinglePractitionerRole(rootNode);

        return result;
    }

    @Search
    public List<DomainResource> search(
            @OptionalParam(name=PractitionerRole.SP_PRACTITIONER) StringAndListParam practitioner,
            @Offset Integer theOffset,
            @Count Integer theCount,
            @IncludeParam(allow={"PractitionerRole:practitioner", "PractitionerRole:location"}) Set<Include> theIncludes) {

        System.out.println("findPractitionerRolesByPractitioner");
        List<DomainResource> results = new ArrayList<>();
        Pagination page = new Pagination(theOffset, theCount);
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            List<SearchCriteria> searchCriteriaList = searchCriteria(PractitionerRole.SP_PRACTITIONER, practitioner);

            JsonNode params = objectMapper.valueToTree(searchCriteriaList);
            ArrayNode rootNode = PractitionerRoleSearch.on(thisClient).search(params, page.getOffset(), page.getCount());
            List<PractitionerRole> practitionerRoles = PractitionerRoleResultParser.parseMultiplePractitionerRoles(rootNode);

            results.addAll(practitionerRoles);
            if (theIncludes.contains(new Include("PractitionerRole:practitioner"))) {
                List<Practitioner> practitioners = getPractitionerInclude(practitionerRoles);    
                results.addAll(practitioners);
            }
            if (theIncludes.contains(new Include("PractitionerRole:location"))) {
                List<Location> locations = getLocationInclude(practitionerRoles);    
                results.addAll(locations);
            }
        } catch (Exception ex) {
            throw new ResourceNotFoundException(ex.getMessage());
        }
        return results;
    }

    private List<Practitioner> getPractitionerInclude(List<PractitionerRole> practitionerRoleResults) {

        List<String> pids = new ArrayList<>();

        for(PractitionerRole current : practitionerRoleResults) {
            String[] parts = current.getPractitioner().getReference().split("/");
            pids.add(parts[parts.length - 1]);
        }

        List<SearchCriteria> searchCriteriaList = List.of(searchCriteria(Practitioner.SP_RES_ID, pids));

        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode params = objectMapper.valueToTree(searchCriteriaList);

		ArrayNode rootNode = PractitionerSearch.on(thisClient).search(params, 1, 20);

        return PractitionerResultParser.parseMultiplePractitioners(rootNode);
    }

    private List<Location> getLocationInclude(List<PractitionerRole> practitionerRoleResults) {

        List<String> pids = new ArrayList<>();

        for(PractitionerRole current : practitionerRoleResults) {
            for(Reference currentLocation : current.getLocation()) {
                String[] parts = currentLocation.getReference().split("/");
                pids.add(parts[parts.length - 1]);
            }
        }

        List<SearchCriteria> searchCriteriaList = List.of(searchCriteria(Practitioner.SP_RES_ID, pids));

        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode params = objectMapper.valueToTree(searchCriteriaList);

        System.out.println(params);

		ArrayNode rootNode = LocationSearch.on(thisClient).search(params, null, null);

        return LocationResultParser.parseMultipleLocations(rootNode);
    }
}
