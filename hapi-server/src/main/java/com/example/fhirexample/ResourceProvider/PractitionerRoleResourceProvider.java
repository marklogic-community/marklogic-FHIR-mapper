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
import ca.uhn.fhir.rest.param.StringOrListParam;
import ca.uhn.fhir.rest.param.StringAndListParam;
import ca.uhn.fhir.rest.server.IResourceProvider;
import ca.uhn.fhir.rest.server.exceptions.ResourceNotFoundException;
import org.hl7.fhir.dstu2.model.IdType;
import org.hl7.fhir.instance.model.api.IBaseResource;
import org.hl7.fhir.r5.model.HumanName;
import org.hl7.fhir.r5.model.Practitioner;
import org.hl7.fhir.r5.model.PractitionerRole;
import org.hl7.fhir.r5.model.DomainResource;

import java.util.*;
import static java.util.stream.Collectors.toList;

import com.marklogic.client.DatabaseClient;
import com.marklogic.practitioner.MLSearch;
import com.marklogic.fhir.ds.PractitionerRoleSearch;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

    @Search
    public List<DomainResource> getAllPractitionerRoles(@Offset Integer theOffset,
                                                  @Count Integer theCount,
                                                  @IncludeParam(allow={"PractitionerRole:practitioner", "PractitionerRole:location"}) Set<Include> theIncludes) {
        List<DomainResource> results = new ArrayList<>();
        Pagination page = new Pagination(theOffset, theCount);
        try {
            JsonNode rootNode;
            rootNode = MLSearch.on(thisClient).search(null, page.getOffset(), page.getCount());
            List<PractitionerRole> practitionerRoles = getMLPractitionerRoles(rootNode);

            results.addAll(practitionerRoles);
            if (theIncludes.contains(new Include("PractitionerRole:practitioner"))) {
                List<Practitioner> practitioners = getPractitionerInclude(practitionerRoles);    
                results.addAll(practitioners);
            }
        } catch (Exception ex) {
            throw new ResourceNotFoundException(ex.getMessage());
        }
        return results;
    }

    @Search
    public List<DomainResource> findPractitionerRolesByPractitioner(
            @RequiredParam(name=PractitionerRole.SP_PRACTITIONER) StringAndListParam theParam,
            @Offset Integer theOffset,
            @Count Integer theCount,
            @IncludeParam(allow={"PractitionerRole:practitioner"}) Set<Include> theIncludes) {

        System.out.println("findPractitionerRolesByPractitioner");
        List<DomainResource> results = new ArrayList<>();
        Pagination page = new Pagination(theOffset, theCount);
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            List<SearchCriteria> searchCriteriaList = searchCriteria(PractitionerRole.SP_PRACTITIONER, theParam);

            JsonNode params = objectMapper.valueToTree(searchCriteriaList);
            JsonNode rootNode = PractitionerRoleSearch.on(thisClient).search(params, page.getOffset(), page.getCount());
            List<PractitionerRole> practitionerRoles = getMLPractitionerRoles(rootNode);

            results.addAll(practitionerRoles);
            if (theIncludes.contains(new Include("PractitionerRole:practitioner"))) {
                List<Practitioner> practitioners = getPractitionerInclude(practitionerRoles);    
                results.addAll(practitioners);
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

        System.out.println(params);

		JsonNode rootNode = MLSearch.on(thisClient).search(params, 1, 20);

        return getMLPractitioners(rootNode);
    }

    private List<Practitioner>  getMLPractitioners(JsonNode rootNode) {
        List<Practitioner> practitioners = new ArrayList<>();
        Practitioner thisPractitioner = null;
        if (rootNode != null) {
            Iterator<Map.Entry<String, JsonNode>> fieldsIterator = rootNode.fields();
            JsonNode docNode = null;
            while (fieldsIterator.hasNext()) {
                Map.Entry<String, JsonNode> field = fieldsIterator.next();
                //docNode = field.getValue().get(0);
                System.out.println("docSize:" + field.getValue().size());
                for (int i = 0; i < field.getValue().size(); i++) {
                    docNode = field.getValue().get(i);
                    if (docNode != null && docNode.isContainerNode()) {
                        // Parse it
                        thisPractitioner = thisParser.parseResource(Practitioner.class, docNode.toString());
                        practitioners.add(thisPractitioner);
                    }
                    if (!practitioners.isEmpty()) {
                        System.out.println(thisPractitioner.getId());
                        List<HumanName> hnList = thisPractitioner.getName();
                        Iterator<HumanName> it = hnList.iterator();
                        while (it.hasNext()) {
                            HumanName obj = (HumanName) it.next();
                            System.out.println(obj.getGiven());
                        }
                    }
                }
            }
        }
        return practitioners;
    }

    private List<PractitionerRole>  getMLPractitionerRoles(JsonNode rootNode) {
        List<PractitionerRole> practitionerRoles = new ArrayList<>();
        if (rootNode != null) {
            Iterator<Map.Entry<String, JsonNode>> fieldsIterator = rootNode.fields();
            while (fieldsIterator.hasNext()) {
                Map.Entry<String, JsonNode> field = fieldsIterator.next();
                for (int i = 0; i < field.getValue().size(); i++) {
                    JsonNode docNode = field.getValue().get(i);
                    if (docNode != null && docNode.isContainerNode()) {
                        // Parse it
                        PractitionerRole current = thisParser.parseResource(PractitionerRole.class, docNode.toString());
                        practitionerRoles.add(current);
                    }
                }
            }
        }
        return practitionerRoles;
    }
}
