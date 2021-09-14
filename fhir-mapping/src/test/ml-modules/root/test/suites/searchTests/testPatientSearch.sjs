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
  
// define the three search service inputs
let search = xdmp.quote( // convert the JSON object search description into a JSON string 
[{
    field: "address-postalcode",
    modifier: null,
    values: ["809999999"]
}])

let start = 0
let limit = 4

// ---  call the search services .sjs module  ---
let resultsSeq = xdmp.invoke("/data-services/location/search.sjs", {search:search, start:start, limit:limit})
// returns:  Sequence( { results: [ {<firstloc>}, {<secondloc>},...]} )

// pull out the locations array from structure above
let resultsObj = fn.head(resultsSeq) // xdmp.invoke always returns a Sequence object, wrapping the  single item returned by the search service 
let results = resultsObj.results     // the wrapped item is an object with a single results: property holding the array of locations

// --- test the returned values ---
test.assertTrue(results.length>0,"Empty result. expected 3 matches")
if (results.length != 3) throw "Should have 3 Locations with this postalCode. Got: " + results.length
results.forEach( r => {
  let addresses = r.address
  let zips = addresses.map(a => a.postalCode)
  test.assertTrue(zips.includes("809999999"), "A retrieved Location has no matching postalCode. Retrieved postalCodes={"+ zips +"}")
  })
