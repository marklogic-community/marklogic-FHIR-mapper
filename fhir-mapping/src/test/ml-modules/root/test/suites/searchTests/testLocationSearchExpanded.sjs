'use strict';
/**
 * This is an expanded version of `testLocationSearch.sjs` which executes against more of the individual criteria the
 * search supports in order to more fully test the search module and its branches.
 *
 * NOTE: this can be run, debugged and modified directly in Qconsole. Tests are usually developed in Qconsole.
 */
const test = require('/test/test-helper.xqy');
const utils = require('../testUtils.sjs');

const assertions = [
// Test searches on individual criteria
  {
    description: 'Exact ID match',
    search: [
      {
        field: 'id',
        values: ['5c8f5d2b-16f9-4e32-a096-d0ad690cc798-providerLocations-1'],
        test(result) {
          return test.assertTrue(this.values.some(value => result.id === value), `A retrieved Location has no matching id. Retrieved id={${result.id}}`);
        },
      },
    ],
    expectedCount: 1,
  },
  {
    description: 'Partial ID match (startsWith)',
    search: [
      {
        field: 'id',
        values: ['5c8f5d2b-16f9-4e32-a096-d0ad690cc798%'],
        test(result) {
          return test.assertTrue(this.values.some(value => result.id.includes(value.replace(/%/g, ''))), `A retrieved Location has no matching id. Retrieved id={${result.id}}`);
        },
      }
    ],
    expectedCount: 3,
  },
  {
    description: 'City match (startsWith)',
    search: [
      {
        field: 'address-city',
        values: ['Colorado'],
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
        test(result) {
          const states = result.address.map(a => a.state);

          return test.assertTrue(this.values.some(state => states.includes(state)));
        },
      },
      {
        field: 'address-postalcode',
        values: ['809999999', '123456789'], // 3 results for 809999999, 0 for 12345678
        test(result) {
          const zips = result.address.map(a => a.postalCode);

          return test.assertTrue(this.values.some(zip => zips.includes(zip)));
        },
      },
    ],
    expectedCount: 3,
  },
].map(opts => {
  try {
    utils.requireProperties(opts, 'description', 'search');
  } catch (e) {
    throw new Error(`Unable to run test for "${opts.description || '<Missing Description>'}": ${e.message}`);
  }

  const { description, search, start, limit, expectedCount } = { expectedCount: null, ...opts };

  const results = fn.head(xdmp.invoke('/data-services/location/search.sjs', {
    // Add default modifier to all criteria, strip test function to be safe (being a function it shouldn't be stringified anyway)
    search: xdmp.quote(search.map(criteria => ({ modifier: null, ...criteria, test: undefined }))),
    start,
    limit,
  }));

  const returnedAssertions = [];

  if (Number.isSafeInteger(expectedCount)) {
    returnedAssertions.push(
      test.assertEqual(expectedCount, results.length, `${description}: Expected ${expectedCount} results, got ${results.length}`),
    );
  } else {
    utils.logger.debug(results.length, results);
  }

  return returnedAssertions.concat(utils.flatten(results.map(r => search.map(criteria => criteria.test ? criteria.test(r) : fn.true()))));
});

utils.flatten(assertions);
