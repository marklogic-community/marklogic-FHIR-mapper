'use strict';
/**
 * This is an expanded version of `testLocationSearch.sjs` which executes against more of the individual criteria the
 * search supports in order to more fully test the search module and its branches.
 *
 * NOTE: this can be run, debugged and modified directly in Qconsole. Tests are usually developed in Qconsole.
 */
const test = require('/test/test-helper.xqy');
const utils = require('../testUtils.sjs');

utils.runTestsAgainstModule('/data-services/location/search.sjs', [
// Test searches on individual criteria
  {
    // The test description. This is required for each TestDescription object
    description: 'Exact ID match',
    // An array of the search criteria to pass to the search module being invoked.
    // This is stringified as JSON at runtime in order to be passed ot the module.
    search: [
      {
        // The field to search on
        field: 'id',
        // The value or values to look for (OR-joined)
        values: ['5c8f5d2b-16f9-4e32-a096-d0ad690cc798-providerLocations-1'],
        // The search modifier to use. *Must* be present, can be null.
        modifier: null,
        // The test to run against each result for this parameter. Can be omitted. This is embedded into each individual search parameter in order to
        // leverage the JavaScript feature of an inherited `this` scope of the search parameter it is contained in
        test(result) {
          return test.assertTrue(this.values.some(value => result.id === value), `A retrieved Location has no matching id. Retrieved id={${result.id}}`);
        },
      },
    ],
    // The expected number of results for the search terms above. Can be omitted or null
    expectedCount: 1,
    // Additional optional params:
    //   start: The offset at which to start returning results
    //   limit: The maximum number of results (past start, if provided) to return
  },
  {
    description: 'City match (startsWith)',
    search: [
      {
        field: 'address-city',
        values: ['Colorado'],
        modifier: null,
        test(result) {
          const cities = result.address.map(a => a.city);

          return test.assertTrue(this.values.some(city => cities.some(c => c.includes(city))), `A retrieved Location has no matching city. Retrieved cities={${cities}}`);
        },
      },
    ],
    expectedCount: 12,
  },
  {
    description: 'City match (contains)',
    search: [
      {
        field: 'address-city',
        values: ['Spring'],
        modifier: 'contains',
        test(result) {
          const cities = result.address.map(a => a.city);

          return test.assertTrue(this.values.some(city => cities.some(c => c.includes(city))), `A retrieved Location has no matching city. Retrieved cities={${cities}}`);
        },
      },
    ],
    expectedCount: 15,
  },
  {
    description: 'State match',
    search: [
      {
        field: 'address-state',
        values: ['CO'],
        modifier: null,
        test(result) {
          const states = result.address.map(a => a.state);

          return test.assertTrue(this.values.some(state => states.some(s => s.includes(state))), `A retrieved Location has no matching state. Retrieved states={${states}}`);
        },
      },
    ],
    expectedCount: 15,
  },
  {
    description: 'Postal Code match',
    search: [
      {
        field: 'address-postalcode',
        values: ['809999999'],
        modifier: null,
        test(result) {
          const zips = result.address.map(a => a.postalCode);

          return test.assertTrue(this.values.some(zip => zips.some(z => z.includes(zip))), `A retrieved Location has no matching postalCode. Retrieved postalCodes={${zips}}`);
        },
      },
    ],
    expectedCount: 3,
  },
  {
    description: 'Address match',
    search: [
      {
        field: 'address',
        values: ['9999 W'],
        modifier: null,
        test(result) {
          const lines = result.address.map(a => a.line);

          return test.assertTrue(this.values.some(line => utils.flatten(lines).some(l => l.includes(line))), `A retrieved Location has no matching address. Retrieved addresses={${lines}}`);
        },
      },
    ],
    expectedCount: 5,
  },
  {
    description: 'Last Updated match (<=)',
    search: [
      {
        field: '_lastUpdated',
        values: ['2021-10-31'],
        modifier: '<=',
        // TODO: Add explicit test
      },
    ],
    expectedCount: 12,
  },
// Test searches on multiple criteria
  {
    description: 'State & Postal Code match',
    search: [
      {
        field: 'address-state',
        values: ['CO', 'NV'], // 5 results for CO, 0 for NV
        modifier: null,
        test(result) {
          const states = result.address.map(a => a.state);

          return test.assertTrue(this.values.some(state => states.includes(state)));
        },
      },
      {
        field: 'address-postalcode',
        values: ['809999999', '123456789'], // 3 results for 809999999, 0 for 12345678
        modifier: null,
        test(result) {
          const zips = result.address.map(a => a.postalCode);

          return test.assertTrue(this.values.some(zip => zips.includes(zip)));
        },
      },
    ],
    expectedCount: 3,
  },
]);
