'use strict';
const egress = require("/fhir-accelerator/egress-mapping.sjs")

// search egress practitioner based on date name
var date;

// starting position for paginated search results.
// currently not implemented.
var start;

// number of results per paginated search results.
// currently not implemented.
var limit;

var results = {};

xdmp.log("Date [" + date + "]", "debug")
if (date) {  

  // search for and filter your documents if needed
  const query = cts.andQuery([
    cts.collectionQuery('provider-scdhhs-canonical'),
    cts.jsonPropertyRangeQuery("ingestTimestamp", ">=", xs.dateTime(date+"T00:00:00")),
    cts.jsonPropertyValueQuery("providerType","PERSON")
  ]) 

  // do the search
  var searchResults = cts.search(query);
  // Apply paging logic
  var rawDocs = fn.subsequence(searchResults, start, limit)
  // standard transform on searchResults variable
  var result = egress.transformMultiple(rawDocs, "PractitionerToFHIR");

  results = {
    "results": result
  };

} else {
  results = {
    "results": "Error in Data Service. date parameter is missing."
  };
}

// return the result
results;
