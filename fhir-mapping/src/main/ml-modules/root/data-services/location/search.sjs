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
// Extract matching locations
var locations = [];
var loopCount = 1
for (var rawDoc of rawDocs) {
  for (const loc of rawDoc.xpath("//providerLocations")) {
    if (cts.contains(loc, cts.andQuery([
            ...searchList.map(({ field, modifier, values }) => {
              const searchValues = egress.searchValuesWithModifier(values, modifier)
              return cts.jsonPropertyValueQuery(fieldMap.get(field), searchValues, options)
            })])
      )) {
        if (locations.length <= limit && loopCount <= limit) {
          if (loopCount >= start) {
            locations.push(loc);            
          }
          loopCount++;
        } else {
          break;
        }
    }
  };
}// standard transform on searchResults variable
const result = egress.transformMultiple(locations, "ProviderToFHIRLocation");

const results = {
  "results": result
};

// return the result
results;
