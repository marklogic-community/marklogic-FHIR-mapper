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
  ['given', 'firstName'],
  ['family', 'lastName'],
  ['name', ['firstName', 'lastName', 'middleName']],
  ['id', 'publicID'],
  ['_id', 'publicID']
]);

const identifierSearchTerms = new Map([
  ['identifier', 'identifiers']
]);
const codingSystemMap = new Map([
  ['http://hl7.org/fhir/sid/us-ssn', 'SSN'],
  ['http://hl7.org/fhir/sid/us-npi', 'NPI'],
]);
const typeSystemMap = new Map([
  ['MMIS', 'http://terminology.hl7.org/CodeSystem/v2-0203|PRN'],
  ['EIN', 'http://terminology.hl7.org/CodeSystem/v2-0203|EN'],
  ['PTIN', 'http://terminology.hl7.org/CodeSystem/v2-0203|TAX'],
  ['ITIN', 'http://terminology.hl7.org/CodeSystem/v2-0203|TAX'],
  ['NCPDP', 'http://terminology.hl7.org/CodeSystem/v2-0203RPH|'],
  ['DEA', 'http://terminology.hl7.org/CodeSystem/v2-0203|DEA'],
  ['NPI', 'http://terminology.hl7.org/CodeSystem/v2-0203|NPI'],
  ['SSN', 'http://terminology.hl7.org/CodeSystem/v2-0203|SS']
]);

const searchList = search ? JSON.parse(search) : [];

// search for and filter your documents if needed
const query = cts.andQuery([
  cts.collectionQuery('provider-scdhhs-canonical'),
  cts.jsonPropertyValueQuery("providerType", "PERSON"),
  ...searchList.map(({ field, modifier, values }) => {
    if (identifierSearchTerms.has(field)) {
      const identifiers = values.map(valueString => {
        const index = valueString.lastIndexOf('|');
        const system = valueString.slice(0, index);
        const value = valueString.slice(index + 1);
        const searchProperties = [];
        if (value !== '') {
          searchProperties.push(cts.jsonPropertyScopeQuery('value', value));
        }
        if (index > 0) {
          const systemType = modifier === 'of-type' ? typeSystemMap.get(system) : codingSystemMap.get(system);
          if (systemType !== undefined) {
            searchProperties.push(cts.jsonPropertyScopeQuery('key', systemType));
          }
        }
        return searchProperties;
      })

      return cts.jsonPropertyScopeQuery(identifierSearchTerms.get(field), cts.andQuery(identifiers));
    } else {
      const searchValues = egress.searchValuesWithModifier(values, modifier)

      return cts.jsonPropertyValueQuery(fieldMap.get(field), searchValues,
        ["case-insensitive", "wildcarded", "whitespace-insensitive", "punctuation-insensitive"])
    }
  })
]);

// do the search
const searchResults = cts.search(query);
// Apply paging logic
const rawDocs = fn.subsequence(searchResults, start, limit)
// standard transform on searchResults variable
const result = egress.transformMultiple(rawDocs, "PractitionerToFHIR");

const results = {
  "results": result
};

// return the result
results;
