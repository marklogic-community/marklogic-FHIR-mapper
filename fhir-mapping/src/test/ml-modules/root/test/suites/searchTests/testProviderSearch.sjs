'use strict';
/**
 * This test executes the search module for providers/practitioners. Typically, this is called via the generated Java
 * class corresponding to the Provider/Practitioner search. Here we call it directly/internally to test the search
 * logic. Testing from .sjs is often easier when JSON objects are involved, or private functions are
 * being tested; otherwise Java-based testing is ideal.
 *
 * NOTE: this can be run, debugged and modified directly in Qconsole. Tests are usually developed in Qconsole.
 */

// This file is meant to serve as an example of how unit tests can be written with a minimum number of statements while
// leveraging some of the more advanced features of modern JavaScript
const test = require('/test/test-helper.xqy');

const value = 'Fred';

// Get the results from invoking the search. `xdmp.invoke` -> Sequence( [ ... ] )
const results = fn.head(xdmp.invoke('/data-services/practitioner/search.sjs', {
  search: xdmp.quote([{
    field:    'name',
    modifier:  null,
    values:   [value],
  }]),
  start: 0,
  limit: 4,
}));

// Test the results for accuracy against expected results
const assertions = [
  test.assertEqual(1, results.length, `Expected 1 result, got ${results.length}`),
  ...results.map(result => {
    const names = result.name.map(name => [name.prefix, name.given.join(' ').trim(), name.family].join(' ').trim());

    test.assertTrue(
      names.some(name => name.includes(value)),
      `A retrieved practitioner does not have a matching name. Retrieved names={${names}}`,
    );
  }),
];

assertions;
