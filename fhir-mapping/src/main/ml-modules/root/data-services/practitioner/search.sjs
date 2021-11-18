'use strict';
const egress = require("/fhir-accelerator/egress-mapping.sjs");
const qu = require('../utils/ctsQueryUtils.sjs');

// search egress practitioner
var search;

// starting position for paginated search results.
// currently not implemented.
var start;

// number of results per paginated search results.
// currently not implemented.
var limit;

const typeSystemMap = new Map([
  ['http://hl7.org/fhir/sid/us-ssn', 'SSN'],
  ['http://hl7.org/fhir/sid/us-npi', 'NPI'],
]);
const codingSystemMap = new Map([
  ['http://terminology.hl7.org/CodeSystem/v2-0203|PRN', 'MMIS'],
  ['http://terminology.hl7.org/CodeSystem/v2-0203|EN', 'EIN'],
  ['http://terminology.hl7.org/CodeSystem/v2-0203|TAX', 'PTIN'],
  ['http://terminology.hl7.org/CodeSystem/v2-0203|TAX', 'ITIN'],
  ['http://terminology.hl7.org/CodeSystem/v2-0203RPH|', 'NCPDP'],
  ['http://terminology.hl7.org/CodeSystem/v2-0203|DEA', 'DEA'],
  ['http://terminology.hl7.org/CodeSystem/v2-0203|NPI', 'NPI'],
  ['http://terminology.hl7.org/CodeSystem/v2-0203|SS', 'SSN']
]);

const fieldToQueryMap = {
  identifier(values, modifier) {
    const identifiers = values.map(valueString => {
      const [value, system] = qu.getValueAndSystemFromString(valueString);

      const search = [];

      if (value !== '') {
        search.push(cts.jsonPropertyValueQuery('value', value));
      }

      if (system) {
        if (modifier !== null && modifier !== 'of-type') { // of-type forces checking the type system instead of the code system
          throw new Error(`The "${modifier}" modifier is not supported for identifier searches`);
        }

        // Convert from FHIR system values to persistent data values
        const systemType = (modifier === 'of-type' ? typeSystemMap : codingSystemMap).get(system);
        search.push(cts.jsonPropertyValueQuery('key', systemType || system));
      }

      return search;
    });

    return cts.jsonPropertyScopeQuery('identifiers', cts.andQuery(identifiers));
  },
  given(values, modifier) {
    return cts.jsonPropertyValueQuery('firstName', values, qu.defaultTextSearchModifiers);
  },
  family(values, modifier) {
    return cts.jsonPropertyValueQuery('lastName', values, qu.defaultTextSearchModifiers);
  },
  name(values, modifier) {
    return cts.jsonPropertyValueQuery(['firstName', 'lastName', 'middleName'], values, qu.defaultTextSearchModifiers);
  },
  _id(values, modifier) {
    return cts.jsonPropertyValueQuery('publicID', values, qu.defaultTextSearchModifiers);
  },
  _version(values, modifier) {
    return cts.jsonPropertyValueQuery('hashValue', values, qu.defaultTextSearchModifiers);
  },
  // FUTURE: expand to allow additional timestamp comparison operations?
  _lastUpdated(values, modifier) {
    return cts.jsonPropertyRangeQuery('ingestTimestamp', '>=', xs.dateTime(`${values[0]}T00:00:00`));
  },

  // Aliases for above entries
  get id() { return this._id; },
};

const searchList = search ? JSON.parse(search) : [];

// search for and filter your documents if needed
const query = cts.andQuery([
  cts.collectionQuery('provider-dhhs-canonical'),
  cts.jsonPropertyValueQuery("providerType", "PERSON"),
  ...searchList.map(qu.searchToQuery(fieldToQueryMap)),
]);

// do the search
const searchResults = cts.search(query);
// Apply paging logic
const rawDocs = fn.subsequence(searchResults, start, limit)
// standard transform on searchResults variable
const result = egress.transformMultiple(rawDocs, "PractitionerToFHIR");

// return the result
result;
