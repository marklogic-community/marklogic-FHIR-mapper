package com.example.fhirexample.ResourceProvider;

import ca.uhn.fhir.parser.IParser;
import ca.uhn.fhir.rest.annotation.*;
import ca.uhn.fhir.rest.api.Constants;
import ca.uhn.fhir.rest.param.DateRangeParam;
import ca.uhn.fhir.rest.param.StringAndListParam;
import ca.uhn.fhir.rest.server.IResourceProvider;
import ca.uhn.fhir.rest.server.exceptions.ResourceNotFoundException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.hl7.fhir.dstu2.model.IdType;
import org.hl7.fhir.instance.model.api.IBaseResource;
import org.hl7.fhir.r5.model.Location;

import java.util.*;

import com.marklogic.client.DatabaseClient;
import com.marklogic.location.MLSearch;
import com.marklogic.util.Pagination;
import com.marklogic.util.SearchCriteria;

import static com.marklogic.util.SearchCriteria.searchCriteria;

public class LocationResourceProvider implements IResourceProvider {
    /**
     * Constructor
     */
    DatabaseClient thisClient;
    IParser thisParser;
    public LocationResourceProvider(DatabaseClient client, IParser parser) {
        thisClient = client;
        thisParser = parser;
    }

     /* You want to be a law abiding class so please
     Implement abstract method getResourceProvider() from IResourceProvider
     */

    @Override
    public Class<? extends IBaseResource> getResourceType() {
        return Location.class;
    }

    /**
     * Simple implementation of the "read" method
     * The "@Read" annotation indicates that this method supports the
     *     * read operation. Read operations should return a single resource
     *     * instance.
     *
     * This method will support a query like this http://localhost:8080/Patient/1
     */
    @Read()
    public Location read(@IdParam IdType theId) {
        Location retLocation = new Location();
        Pagination page = new Pagination(null, null);
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            List<SearchCriteria> searchCriteriaList = List.of(searchCriteria(Location.SP_RES_ID, theId.getIdPart()));

            JsonNode params = objectMapper.valueToTree(searchCriteriaList);
            JsonNode rootNode = MLSearch.on(thisClient).searchById(params, page.getOffset(), page.getCount());
            retLocation = getMLLocation(rootNode);
        } catch (Exception ex) {
            throw new ResourceNotFoundException(ex.getMessage());
        }
        return retLocation;
    }

    @Search
    public List<Location> search(
            @OptionalParam(name = Location.SP_IDENTIFIER) StringAndListParam identifier,
            @OptionalParam(name = Location.SP_NAME) StringAndListParam name,
            @OptionalParam(name = Location.SP_TYPE) StringAndListParam type,
            @OptionalParam(name = Location.SP_ADDRESS_CITY) StringAndListParam city,
            @OptionalParam(name = Location.SP_ADDRESS_STATE) StringAndListParam state,
            @OptionalParam(name = Location.SP_ADDRESS_POSTALCODE) StringAndListParam zip,
            @Offset Integer offset,
            @Count Integer count) {
        List<Location> locations = new ArrayList<Location>();
        Pagination page = new Pagination(offset, count);

        List<SearchCriteria> searchTerms = new ArrayList<SearchCriteria>();
        searchTerms.addAll(searchCriteria(Location.SP_IDENTIFIER, identifier));
        searchTerms.addAll(searchCriteria(Location.SP_NAME, name));
        searchTerms.addAll(searchCriteria(Location.SP_TYPE, type));
        searchTerms.addAll(searchCriteria(Location.SP_ADDRESS_CITY, city));
        searchTerms.addAll(searchCriteria(Location.SP_ADDRESS_STATE, state));
        searchTerms.addAll(searchCriteria(Location.SP_ADDRESS_POSTALCODE, zip));
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            JsonNode params = objectMapper.valueToTree(searchTerms);
            JsonNode rootNode = MLSearch.on(thisClient).search(params, page.getOffset(), page.getCount());
            locations = getMLLocations(rootNode);
        } catch (Exception ex) {
            throw new ResourceNotFoundException(ex.getMessage());
        }
        return locations;
    }

    @Search
    public List<Location> findLocationsById(
            @RequiredParam(name = Location.SP_RES_ID) StringAndListParam id,
            @Offset Integer theOffset,
            @Count Integer theCount) {
        List<Location> locations = new ArrayList<Location>();
        Pagination page = new Pagination(theOffset, theCount);
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            List<SearchCriteria> searchTerms = new ArrayList<SearchCriteria>();
            searchTerms.addAll(searchCriteria(Location.SP_RES_ID, id));
            JsonNode params = objectMapper.valueToTree(searchTerms);
            System.out.println("PARAMS:" + params.toString());
            JsonNode rootNode = MLSearch.on(thisClient).searchById(params, page.getOffset(), page.getCount());
            locations = getMLLocations(rootNode);
        } catch (Exception ex) {
            throw new ResourceNotFoundException(ex.getMessage());
        }
        return locations;
    }

    @Search
    public List<Location> findLocationsByLastUpdated(
            @RequiredParam(name=Constants.PARAM_LASTUPDATED) DateRangeParam lastUpdated,
            @Offset Integer theOffset,
            @Count Integer theCount) {
        List<Location> locations = new ArrayList<Location>();
        Pagination page = new Pagination(theOffset, theCount);
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            List<SearchCriteria> searchTerms = new ArrayList<SearchCriteria>();
            searchTerms.addAll(searchCriteria(Constants.PARAM_LASTUPDATED, lastUpdated));
            JsonNode params = objectMapper.valueToTree(searchTerms);
            System.out.println("PARAMS:" + params.toString());
            JsonNode rootNode = MLSearch.on(thisClient).searchByDate(params, page.getOffset(), page.getCount());
            locations = getMLLocations(rootNode);
        } catch (Exception ex) {
            throw new ResourceNotFoundException(ex.getMessage());
        }
        return locations;
    }

    @Search()
    public List<Location> searchByLocationAddress(
            @RequiredParam(name=Location.SP_ADDRESS) StringAndListParam theAddressParts,
            @Offset Integer theOffset,
            @Count Integer theCount) {

        // StringAndListParam is a container for 0..* StringOrListParam, which is in turn a
        // container for 0..* strings. It is a little bit weird to understand at first, but think of the
        // StringAndListParam to be an AND list with multiple OR lists inside it. So you will need
        //
        System.out.println("ADDRESS PARTS:" + theAddressParts.toString());
        List<Location> locations = new ArrayList<Location>();
        Pagination page = new Pagination(theOffset, theCount);
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            List<SearchCriteria> searchTerms = new ArrayList<SearchCriteria>();
            searchTerms.addAll(searchCriteria(Location.SP_ADDRESS, theAddressParts));
            JsonNode params = objectMapper.valueToTree(searchTerms);
            System.out.println("PARAMS:" + params.toString());
            JsonNode rootNode = MLSearch.on(thisClient).search(params, page.getOffset(), page.getCount());
            locations = getMLLocations(rootNode);
        } catch (Exception ex) {
            throw new ResourceNotFoundException(ex.getMessage());
        }
        return locations;
    }

    private Location getMLLocation(JsonNode rootNode) {
        Location thisLocation = null;
        if (rootNode != null) {
            Iterator<Map.Entry<String, JsonNode>> fieldsIterator = rootNode.fields();
            JsonNode docNode = null;
            while (fieldsIterator.hasNext()) {
                Map.Entry<String,JsonNode> field = fieldsIterator.next();
                //docNode = field.getValue().get(0);
                System.out.println("docSize:" + field.getValue().size());
                for (int i=0; i < field.getValue().size(); i++) {
                    docNode = field.getValue().get(i);
                    if (docNode != null && docNode.isContainerNode()) {
                        // Parse it
                        thisLocation = thisParser.parseResource(Location.class, docNode.toString());
                    }
                }
            }
        }
        return thisLocation;
    }

    private List<Location> getMLLocations(JsonNode rootNode) {
        List<Location> locations = new ArrayList<Location>();
        Location thisLocation = null;
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
                        thisLocation = thisParser.parseResource(Location.class, docNode.toString());
                        locations.add(thisLocation);
                    }
                }
            }
        }
        return locations;
    }
}
