'use strict';

const egress = require("/fhir-accelerator/egress-mapping.sjs")

// Common Egress Code to transform documents returned from the query
function getEgressDocuments(query) {
    var rawDocs = fn.subsequence(cts.search(query), 1, 20)
    var egressedDoc = []

    //if (rawDocs.length <= limit) {
    for (var rawDoc of rawDocs) {
      egressedDoc.push(egress.preMapMapAndUnwrap(rawDoc, "PractitionerToFHIR"))
    }
    //} else {
    //  var limitExceeded = "Requested number of documents limit exceeded:" + limit;
    //  egressedDoc.push({ limitExceeded });
    //}
	return egressedDoc;
};

module.exports = {
  getEgressDocuments,
};
