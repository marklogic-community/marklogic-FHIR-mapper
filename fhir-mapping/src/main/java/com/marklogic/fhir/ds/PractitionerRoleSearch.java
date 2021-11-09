package com.marklogic.fhir.ds;

// IMPORTANT: Do not edit. This file is generated.

import com.marklogic.client.io.Format;


import com.marklogic.client.DatabaseClient;
import com.marklogic.client.io.marker.JSONWriteHandle;

import com.marklogic.client.impl.BaseProxy;

/**
 * Searches practitionerRole based on various attributes
 */
public interface PractitionerRoleSearch {
    /**
     * Creates a PractitionerRoleSearch object for executing operations on the database server.
     *
     * The DatabaseClientFactory class can create the DatabaseClient parameter. A single
     * client object can be used for any number of requests and in multiple threads.
     *
     * @param db	provides a client for communicating with the database server
     * @return	an object for executing database operations
     */
    static PractitionerRoleSearch on(DatabaseClient db) {
      return on(db, null);
    }
    /**
     * Creates a PractitionerRoleSearch object for executing operations on the database server.
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
    static PractitionerRoleSearch on(DatabaseClient db, JSONWriteHandle serviceDeclaration) {
        final class PractitionerRoleSearchImpl implements PractitionerRoleSearch {
            private DatabaseClient dbClient;
            private BaseProxy baseProxy;

            private BaseProxy.DBFunctionRequest req_read;
            private BaseProxy.DBFunctionRequest req_search;

            private PractitionerRoleSearchImpl(DatabaseClient dbClient, JSONWriteHandle servDecl) {
                this.dbClient  = dbClient;
                this.baseProxy = new BaseProxy("/data-services/practitionerRole/", servDecl);

                this.req_read = this.baseProxy.request(
                    "read.sjs", BaseProxy.ParameterValuesKind.SINGLE_ATOMIC);
                this.req_search = this.baseProxy.request(
                    "search.sjs", BaseProxy.ParameterValuesKind.MULTIPLE_MIXED);
            }

            @Override
            public com.fasterxml.jackson.databind.JsonNode read(String id) {
                return read(
                    this.req_read.on(this.dbClient), id
                    );
            }
            private com.fasterxml.jackson.databind.JsonNode read(BaseProxy.DBFunctionRequest request, String id) {
              return BaseProxy.JsonDocumentType.toJsonNode(
                request
                      .withParams(
                          BaseProxy.atomicParam("id", false, BaseProxy.StringType.fromString(id))
                          ).responseSingle(false, Format.JSON)
                );
            }

            @Override
            public com.fasterxml.jackson.databind.node.ArrayNode search(com.fasterxml.jackson.databind.JsonNode search, Integer start, Integer limit) {
                return search(
                    this.req_search.on(this.dbClient), search, start, limit
                    );
            }
            private com.fasterxml.jackson.databind.node.ArrayNode search(BaseProxy.DBFunctionRequest request, com.fasterxml.jackson.databind.JsonNode search, Integer start, Integer limit) {
              return BaseProxy.ArrayType.toArrayNode(
                request
                      .withParams(
                          BaseProxy.documentParam("search", true, BaseProxy.JsonDocumentType.fromJsonNode(search)),
                          BaseProxy.atomicParam("start", true, BaseProxy.IntegerType.fromInteger(start)),
                          BaseProxy.atomicParam("limit", true, BaseProxy.IntegerType.fromInteger(limit))
                          ).responseSingle(false, Format.JSON)
                );
            }
        }

        return new PractitionerRoleSearchImpl(db, serviceDeclaration);
    }

  /**
   * Invokes the read operation on the database server
   *
   * @param id	Id to read
   * @return	
   */
    com.fasterxml.jackson.databind.JsonNode read(String id);

  /**
   * Invokes the search operation on the database server
   *
   * @param search	List of search terms and values
   * @param start	Start position when results are limited. Default is 0.
   * @param limit	Limit results to the given number. Default is 20.
   * @return	
   */
    com.fasterxml.jackson.databind.node.ArrayNode search(com.fasterxml.jackson.databind.JsonNode search, Integer start, Integer limit);

}
