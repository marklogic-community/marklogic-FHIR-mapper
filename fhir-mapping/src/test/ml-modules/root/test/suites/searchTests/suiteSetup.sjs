'use strict';

const test = require('/test/test-helper.xqy');
const utils = require('../testUtils.sjs');

utils.loadTestDocuments({ path: '/', recursive: true });

// Runs once when your suite is started.
// You can use this to insert some data that will not be modified over the course of the suite's tests.
// If no suite-specific setup is required, this file may be deleted.
test.log("Search Suite Setup COMPLETE....");
