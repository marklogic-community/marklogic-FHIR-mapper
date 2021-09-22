'use strict';
const egress = require("/fhir-accelerator/egress-mapping.sjs")

const uuidRegex = /^[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}/
const indexRegex = /\d+$/

// search egress practitioner
var id;

// break down complex id into parts
var practitionerUUIDResult = uuidRegex.exec(id)
var practitionerUUID = null
if(practitionerUUIDResult && practitionerUUIDResult.length > 0) {
  practitionerUUID = practitionerUUIDResult[0]
}

var indexResult = indexRegex.exec(id)
var index = null
if(indexResult && indexResult.length > 0) {
  index = parseInt(indexResult[0])
}


const query = cts.andQuery([
  cts.collectionQuery('provider-dhhs-canonical'),
  cts.jsonPropertyValueQuery("providerType", "PERSON"),
  cts.jsonPropertyValueQuery('publicID', practitionerUUID)
]);

const rawDoc = fn.head(cts.search(query));

const rawPractitionerRole = fn.head(rawDoc.xpath("//providerAffiliations["+index+"]"))

const result = egress.preMapMapAndUnwrap(rawPractitionerRole, "ProviderToUSCorePractitionerRole");

result


