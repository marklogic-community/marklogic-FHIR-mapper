package com.example.fhirexample.ResourceProvider;

import ca.uhn.fhir.parser.IParser;
import ca.uhn.fhir.rest.annotation.*;
import ca.uhn.fhir.rest.api.Constants;
import ca.uhn.fhir.rest.param.DateParam;
import ca.uhn.fhir.rest.param.StringAndListParam;
import ca.uhn.fhir.rest.server.IResourceProvider;
import ca.uhn.fhir.rest.server.exceptions.ResourceNotFoundException;

import com.example.fhirexample.utils.LocationRestultParser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;

import org.hl7.fhir.r4.model.IdType;
import org.hl7.fhir.instance.model.api.IBaseResource;
import org.hl7.fhir.r4.model.Location;

import java.util.*;

import com.marklogic.client.DatabaseClient;
import com.marklogic.fhir.ds.LocationSearch;
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
     * This method will support a query like this http://localhost:8080/Location/1
     */
    @Read()
    public Location read(@IdParam IdType theId) {
        Location retLocation = new Location();
        Pagination page = new Pagination(null, null);
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            List<SearchCriteria> searchCriteriaList = List.of(searchCriteria(Location.SP_RES_ID, theId.getIdPart()));

            JsonNode params = objectMapper.valueToTree(searchCriteriaList);
            ArrayNode rootNode = LocationSearch.on(thisClient).search(params, page.getOffset(), page.getCount());
            retLocation = LocationRestultParser.parseSingleLocation(rootNode);
        } catch (Exception ex) {
            throw new ResourceNotFoundException(ex.getMessage());
        }
        return retLocation;
    }

    @Search
    public List<Location> search(
            @OptionalParam(name = Location.SP_RES_ID) StringAndListParam id,
            @OptionalParam(name = Constants.PARAM_LASTUPDATED) DateParam lastUpdated,
            @OptionalParam(name = Location.SP_NAME) StringAndListParam name,
            @OptionalParam(name = Location.SP_ADDRESS_CITY) StringAndListParam city,
            @OptionalParam(name = Location.SP_ADDRESS_STATE) StringAndListParam state,
            @OptionalParam(name = Location.SP_ADDRESS_POSTALCODE) StringAndListParam zip,
            @OptionalParam(name = Location.SP_ADDRESS) StringAndListParam address,
            @Offset Integer offset,
            @Count Integer count) {
        List<Location> locations = new ArrayList<Location>();
        Pagination page = new Pagination(offset, count);

        List<SearchCriteria> searchTerms = new ArrayList<SearchCriteria>();
        searchTerms.addAll(searchCriteria(Location.SP_RES_ID, id));
        if(lastUpdated != null)
            searchTerms.add(searchCriteria(Constants.PARAM_LASTUPDATED, lastUpdated));
            searchTerms.addAll(searchCriteria(Location.SP_NAME, name));
            searchTerms.addAll(searchCriteria(Location.SP_ADDRESS_CITY, city));
            searchTerms.addAll(searchCriteria(Location.SP_ADDRESS_STATE, state));
            searchTerms.addAll(searchCriteria(Location.SP_ADDRESS_POSTALCODE, zip));
            searchTerms.addAll(searchCriteria(Location.SP_ADDRESS, address));
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            JsonNode params = objectMapper.valueToTree(searchTerms);

            ArrayNode rootNode = LocationSearch.on(thisClient).search(params, page.getOffset(), page.getCount());
            locations = LocationRestultParser.parseMultipleLocations(rootNode);
        } catch (Exception ex) {
            throw new ResourceNotFoundException(ex.getMessage());
        }
        return locations;
    }
}
