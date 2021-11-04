'use strict';
/**
 * This test executes the search module for location. Typically, this is called via the generated Java
 * class corresponding to the Location search. Here we call it directly/internally to test the search
 * logic. Testing from .sjs is often easier when JSON objects are involved, or private functinos are 
 * being tested; otherwise Java-based testing is ideal.
 * 
 * NOTE: this can be run, debugged and modified directly in Qconsole. Tests are usually developed in Qconsole.
 */

// The test assertion library is written in .xqy but MarkLogic can call those functions here from JavaScript
// Note: this library is part of the ml-unit-test bundle, which is included via a build.gradle dependency
const test = require('/test/test-helper.xqy');

const zip = '81073';
  
// define the three search service inputs
const search = xdmp.quote([{ // convert the JSON object search description into a JSON string
  field: 'address-postalcode',
  modifier: null,
  values: [zip],
}]);

const start = 0;
const limit = 4;

// ---  call the search services .sjs module  ---
const resultsSeq = xdmp.invoke("/data-services/patient/search.sjs", { search, start, limit });
// returns:  Sequence( { results: [ {<firstloc>}, {<secondloc>},...]} )

// pull out the locations array from structure above
const resultsObj = fn.head(resultsSeq); // xdmp.invoke always returns a Sequence object, wrapping the  single item returned by the search service
const results = resultsObj.results;     // the wrapped item is an object with a single results: property holding the array of locations

// --- test the returned values ---
const assertions = [
  test.assertEqual(3, results.length, "Should have 3 patients with this postalCode. Got: " + results.length),
  ...results.map( r => {
    const addresses = r.address;
    const zips = addresses.map(a => a.postalCode);
    return test.assertTrue(zips.includes(zip), "A retrieved patient has no matching postalCode. Retrieved postalCodes={"+ zips +"}");
  }),
];
