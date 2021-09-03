package com.marklogic.location;

// IMPORTANT: Do not edit. This file is generated.

import com.marklogic.client.io.Format;


import com.marklogic.client.DatabaseClient;
import com.marklogic.client.io.marker.JSONWriteHandle;

import com.marklogic.client.impl.BaseProxy;

/**
 * Searches practitioner location based on various attributes
 */
public interface MLSearch {
    /**
     * Creates a MLSearch object for executing operations on the database server.
     *
     * The DatabaseClientFactory class can create the DatabaseClient parameter. A single
     * client object can be used for any number of requests and in multiple threads.
     *
     * @param db	provides a client for communicating with the database server
     * @return	an object for executing database operations
     */
    static MLSearch on(DatabaseClient db) {
      return on(db, null);
    }
    /**
     * Creates a MLSearch object for executing operations on the database server.
     *
     * The DatabaseClientFactory class can create the DatabaseClient parameter. A single
     * client object can be used for any number of requests and in multiple threads.
     *
     * The service declaration uses a custom implementation of the same service instead
     * of the default implementation of the service by specifying an endpoint directory
     * in the modules database with the implementation. A service.json file with the
     * declaration can be read with FileHandle or a string serialization of the JSON
     * declaration with StringHandle.
     *
     * @param db	provides a client for communicating with the database server
     * @param serviceDeclaration	substitutes a custom implementation of the service
     * @return	an object for executing database operations
     */
    static MLSearch on(DatabaseClient db, JSONWriteHandle serviceDeclaration) {
        final class MLSearchImpl implements MLSearch {
            private DatabaseClient dbClient;
            private BaseProxy baseProxy;

            private BaseProxy.DBFunctionRequest req_search;
            private BaseProxy.DBFunctionRequest req_searchByDate;
            private BaseProxy.DBFunctionRequest req_searchById;

            private MLSearchImpl(DatabaseClient dbClient, JSONWriteHandle servDecl) {
                this.dbClient  = dbClient;
                this.baseProxy = new BaseProxy("/data-services/location/", servDecl);

                this.req_search = this.baseProxy.request(
                    "search.sjs", BaseProxy.ParameterValuesKind.MULTIPLE_MIXED);
                this.req_searchByDate = this.baseProxy.request(
                    "searchByDate.sjs", BaseProxy.ParameterValuesKind.MULTIPLE_MIXED);
                this.req_searchById = this.baseProxy.request(
                    "searchById.sjs", BaseProxy.ParameterValuesKind.MULTIPLE_MIXED);
            }

            @Override
            public com.fasterxml.jackson.databind.JsonNode search(com.fasterxml.jackson.databind.JsonNode search, Integer start, Integer limit) {
                return search(
                    this.req_search.on(this.dbClient), search, start, limit
                    );
            }
            private com.fasterxml.jackson.databind.JsonNode search(BaseProxy.DBFunctionRequest request, com.fasterxml.jackson.databind.JsonNode search, Integer start, Integer limit) {
              return BaseProxy.JsonDocumentType.toJsonNode(
                request
                      .withParams(
                          BaseProxy.documentParam("search", true, BaseProxy.JsonDocumentType.fromJsonNode(search)),
                          BaseProxy.atomicParam("start", true, BaseProxy.IntegerType.fromInteger(start)),
                          BaseProxy.atomicParam("limit", true, BaseProxy.IntegerType.fromInteger(limit))
                          ).responseSingle(false, Format.JSON)
                );
            }

            @Override
            public com.fasterxml.jackson.databind.JsonNode searchByDate(com.fasterxml.jackson.databind.JsonNode search, Integer start, Integer limit) {
                return searchByDate(
                    this.req_searchByDate.on(this.dbClient), search, start, limit
                    );
            }
            private com.fasterxml.jackson.databind.JsonNode searchByDate(BaseProxy.DBFunctionRequest request, com.fasterxml.jackson.databind.JsonNode search, Integer start, Integer limit) {
              return BaseProxy.JsonDocumentType.toJsonNode(
                request
                      .withParams(
                          BaseProxy.documentParam("search", true, BaseProxy.JsonDocumentType.fromJsonNode(search)),
                          BaseProxy.atomicParam("start", true, BaseProxy.IntegerType.fromInteger(start)),
                          BaseProxy.atomicParam("limit", true, BaseProxy.IntegerType.fromInteger(limit))
                          ).responseSingle(false, Format.JSON)
                );
            }

            @Override
            public com.fasterxml.jackson.databind.JsonNode searchById(com.fasterxml.jackson.databind.JsonNode search, Integer start, Integer limit) {
                return searchById(
                    this.req_searchById.on(this.dbClient), search, start, limit
                    );
            }
            private com.fasterxml.jackson.databind.JsonNode searchById(BaseProxy.DBFunctionRequest request, com.fasterxml.jackson.databind.JsonNode search, Integer start, Integer limit) {
              return BaseProxy.JsonDocumentType.toJsonNode(
                request
                      .withParams(
                          BaseProxy.documentParam("search", true, BaseProxy.JsonDocumentType.fromJsonNode(search)),
                          BaseProxy.atomicParam("start", true, BaseProxy.IntegerType.fromInteger(start)),
                          BaseProxy.atomicParam("limit", true, BaseProxy.IntegerType.fromInteger(limit))
                          ).responseSingle(false, Format.JSON)
                );
            }
        }

        return new MLSearchImpl(db, serviceDeclaration);
    }

  /**
   * Invokes the search operation on the database server
   *
   * @param search	List of search terms and values
   * @param start	Start position when results are limited. Default is 0.
   * @param limit	Limit results to the given number. Default is 20.
   * @return	
   */
    com.fasterxml.jackson.databind.JsonNode search(com.fasterxml.jackson.databind.JsonNode search, Integer start, Integer limit);

  /**
   * Invokes the searchByDate operation on the database server
   *
   * @param search	List of search terms and values
   * @param start	Start position when results are limited. Default is 0.
   * @param limit	Limit results to the given number. Default is 20.
   * @return	
   */
    com.fasterxml.jackson.databind.JsonNode searchByDate(com.fasterxml.jackson.databind.JsonNode search, Integer start, Integer limit);

  /**
   * Invokes the searchById operation on the database server
   *
   * @param search	List of search terms and values
   * @param start	Start position when results are limited. Default is 0.
   * @param limit	Limit results to the given number. Default is 20.
   * @return	
   */
    com.fasterxml.jackson.databind.JsonNode searchById(com.fasterxml.jackson.databind.JsonNode search, Integer start, Integer limit);

}
