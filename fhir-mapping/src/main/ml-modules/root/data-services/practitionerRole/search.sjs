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
  ['practitioner', 'publicID']
]);

const searchList = search ? JSON.parse(search) : [];

/*
search JSON format
{
  field: "practitioner",
  values: ["practitionerid-1", "practitionerid-2"]
}
*/

// search for and filter your documents if needed
const query = cts.andQuery([
  cts.collectionQuery('provider-scdhhs-canonical'),
  cts.jsonPropertyValueQuery("providerType", "PERSON"),
  ...searchList.map(({ field, modifier, values }) => {
    if(field === "practitioner") {
      const searchValues = egress.searchValuesWithModifier(values, "exact")
      return cts.jsonPropertyValueQuery('publicID', searchValues)
    }
  })
]);

// do the search
const rawDocs = cts.search(query);

//get the PRoles

var practitionerRoles = [];

for (var rawDoc of rawDocs) {
  for (const pr of rawDoc.xpath("//providerAffiliations")) {
    if (practitionerRoles.length < limit)
    practitionerRoles.push(pr)
  };
}

// Apply paging logic
//const rawDocs = fn.subsequence(searchResults, start, limit)

// standard transform on searchResults variable
const result = egress.transformMultiple(practitionerRoles, "ProviderToUSCorePractitionerRole");

const results = {
  "results": result
};

// return the result
results;
