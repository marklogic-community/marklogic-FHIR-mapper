'use strict';

const test = require('/test/test-helper.xqy');
const utils = require('../testUtils.sjs');

const assertions = [
  {
    field: 'id',
    value: '5c8f5d2b-16f9-4e32-a096-d0ad690cc798-providerLocations-1',
    expectedCount: 1,
    perResultTest(result, expected) {
      return test.assertEqual(result.id, expected);
    },
  },
  {
    field: 'id',
    value: '5c8f5d2b-16f9-4e32-a096-d0ad690cc798%',
    expectedCount: 3,
    perResultTest(result, expected) {
      return test.assertTrue(result.id.includes(expected.replace(/%/g, '')));
    },
  },
  {
    field: 'address-city',
    value: 'Colorado',
    expectedCount: 4,
    perResultTest(result, expected) {
      const cities = result.address.map(a => a.city);

      return test.assertTrue(cities.some(city => city.includes(expected)), `A retrieved Location has no matching city. Retrieved cities={${cities}}`);
    }
  },
  {
    field: 'address-city',
    value: 'Springs',
    modifier: 'contains',
    expectedCount: 4,
    perResultTest(result, expected) {
      const cities = result.address.map(a => a.city);

      return test.assertTrue(cities.some(city => city.includes(expected)), `A retrieved Location has no matching city. Retrieved cities={${cities}}`);
    }
  },
  {
    field: 'address-state',
    value: 'CO',
    expectedCount: 4,
    perResultTest(result, expected) {
      const states = result.address.map(a => a.state);

      return test.assertTrue(states.includes(expected), `A retrieved Location has no matching state. Retrieved states={${states}}`);
    },
  },
  {
    field: 'address-postalcode',
    value: '809999999',
    expectedCount: 3,
    perResultTest(result, expected) {
      const zips = result.address.map(a => a.postalCode);

      return test.assertTrue(zips.includes(expected), `A retrieved Location has no matching postalCode. Retrieved postalCodes={${zips}}`);
    },
  },
  {
    field: 'address',
    value: '9999 W',
    expectedCount: 4,
    perResultTest(result, expected) {
      const lines = result.address.map(a => a.line);

      return test.assertTrue(utils.flatten(lines).some(line => line.startsWith(expected)), `A retrieved Location has no matching address. Retrieved addresses={${lines}}`);
    },
  },
  {
    field: '_lastUpdated',
    value: '2021-12-31',
    modifier: '<=',
    expectedCount: 4,
    perResultTest(result, expected) {
      utils.logger.info(result.meta.lastUpdated);

      return fn.true();
    }
  }
].map(opts => {
  const { field, value, modifier, start, limit, expectedCount, perResultTest } = {
    start: 0,
    limit: 4,
    modifier: null,
    expectedCount: null,
    perResultTest: () => expectedCount === 0 ? fn.false() : fn.true(),

    ...opts
  };

  const results = fn.head(xdmp.invoke('/data-services/location/search.sjs', {
    search: xdmp.quote([{ field, modifier, values: [value] }]),
    start,
    limit,
  }));

  const returnedAssertions = [];

  if (Number.isSafeInteger(expectedCount)) {
    returnedAssertions.push(
      test.assertEqual(expectedCount, results.length, `Expected ${expectedCount} results, got ${results.length}`),
    );
  } else {
    utils.logger.debug(results.length, results);
  }

  return returnedAssertions.concat(results.map(r => perResultTest(r, value)));
});

utils.flatten(assertions);
