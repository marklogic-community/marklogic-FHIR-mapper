'use strict';

const egress = require("/fhir-accelerator/egress-mapping.sjs")

// search egress practitioner
var search;

// starting position for paginated search results.
// currently not implemented.
var start;

// number of results per paginated search results.
// currently not implemented.
var limit;

const fieldMap = new Map([
  ['address-city', 'city'],
  ['address-state', 'state'],
  ['address-postalcode', 'zip'],
  ['identifier', 'id'], // TODO: This isn't really supposed to be ID
  ['id', 'id'],
  ['_id', 'id'],
  ['name', 'name'],
  ['type', 'addresstype'],
  ['address', ["name", "line1", "line2", "line3", "city", "county", "countyCode", "state","zip","addresstype"]]
]);

const searchCriteriaList = search ? JSON.parse(search) : [];
const options = ["case-insensitive", "wildcarded", "whitespace-insensitive", "punctuation-insensitive"];

// define a query for the containing documents that have the collections. These will be Provider records.
let docQuery = egress.buildQuery(searchCriteriaList, 'provider-canonical', cts.jsonPropertyValueQuery("providerType", "PERSON"), options);
let itemQuery = egress.buildQuery(searchCriteriaList, null, null, options);
xdmp.log("location search doc query: "+xdmp.quote(docQuery))
xdmp.log("location search item query: "+xdmp.quote(itemQuery))

// do the query, sub-item filtering, and Step transform
let result = egress.queryAndMap(docQuery, itemQuery, "//providerLocations", "ProviderToFHIRLocation", start, limit)

// nest the array into a single object (easier to write a data service that returns an object vs an array)
const results = {
  "results": result
};

results