'use strict';

const test = require('/test/test-helper.xqy');
const utils = require('../testUtils.sjs');

utils.unloadTestDocuments({ path: '/', recursive: true });

// Runs once when your suite is finished, to clean up after the suite's tests.
// If no suite-specific teardown is required, this file may be deleted.
test.log("Egress Suite Teardown ENDING....");
