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
    return qu.textSearch('firstName', values, modifier);
  },
  family(values, modifier) {
    return qu.textSearch('lastName', values, modifier);
  },
  name(values, modifier) {
    return qu.textSearch(['firstName', 'lastName', 'middleName'], values, modifier);
  },
  _id(values, modifier) {
    return qu.textSearch('publicID', values, modifier);
  },
  _version(values, modifier) {
    return qu.textSearch('hashValue', values, modifier);
  },
  _lastUpdated(values, modifier) {
    return cts.jsonPropertyRangeQuery('ingestTimestamp', egress.modifierPrefixMap.get(modifier) || modifier, xs.dateTime(`${values[0]}T00:00:00`));
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
