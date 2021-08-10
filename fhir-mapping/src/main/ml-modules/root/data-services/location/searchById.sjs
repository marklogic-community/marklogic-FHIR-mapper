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
  ['id', 'publicID'],
  ['_id', 'publicID']
]);

const searchList = search ? JSON.parse(search) : [];
const options = ["case-insensitive", "wildcarded", "whitespace-insensitive", "punctuation-insensitive"];

// search for and filter your documents if needed
const query = cts.andQuery([
  cts.collectionQuery('provider-scdhhs-canonical'),
  cts.jsonPropertyValueQuery("providerType", "PERSON"),
  ...searchList.map(({ field, modifier, values }) => {
    const searchValues = egress.searchValuesWithModifier(values, modifier)
    return cts.jsonPropertyValueQuery(fieldMap.get(field), searchValues, options)
  })
]);

// do the search
const searchResults = cts.search(query);
// Apply paging logic
const rawDocs = fn.subsequence(searchResults, start, limit)
// Extract matching locations without any other filtering
var locations = [];
for (var rawDoc of rawDocs) {
  for (const loc of rawDoc.xpath("//providerLocations")) {
      if (locations.length < limit)
        locations.push(loc)
  };
}
// standard transform on searchResults variable
const result = egress.transformMultiple(locations, "ProviderToFHIRLocation");

const results = {
  "results": result
};

// return the result
results;
