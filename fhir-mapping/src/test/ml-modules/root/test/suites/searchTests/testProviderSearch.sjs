'use strict';

const test = require('/test/test-helper.xqy');

const value = 'Fred';

const search = xdmp.quote([{
  field:    'name',
  modifier:  null,
  values:   [value],
}]);

const start = 0;
const limit = 4;

const { results } = fn.head(xdmp.invoke('/data-services/practitioner/search.sjs', { search, start, limit }));

const assertions = [
  test.assertEqual(1, results.length, `Expected 1 result, got ${results.length}`),
  ...results.map(result => {
    const names = result.name;

    test.assertTrue(names.some(name => (
      name.family.includes(value) ||
      name.given.some(givenName => givenName.includes(value)) ||
      name.prefix.includes(value)
    )));
  }),
];

assertions;
