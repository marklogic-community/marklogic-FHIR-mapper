'use strict';
const { getTraceHelpers } = require('/lib/util/trace-helpers.sjs');

var contentArray;
var options;

var entireRecord;
var destination;
var indexDestination;
var siblingName;

const { trace, traceObject } = getTraceHelpers('expand-instance');

traceObject(contentArray);
traceObject(options);

const runKey = '__expand-instance__';

/**
 * Adds the provided node(s) to the original envelope/instance of the document it was pulled from
 * along with its XQuery index for reference, e.g.:
 *
 * ({
 *   "envelope": {
 *     "headers": { ... },
 *     "triples": [...],
 *     "instance": {
 *       "instanceType": { "node": [{ ... }, { ... }, ...], ... },
 *     },
 *   }
 * }).xpath('/envelope/instance/instanceType/node')
 *
 * with provided variables
 *
 * {
 *   "entireRecord": true,
 *   "destination": "node",
 *   "indexDestination": "index",
 *   "siblingName": "node",
 * }
 *
 * becomes
 *
 * {
 *   "envelope": {
 *     "headers": { ... },
 *     "triples": [...],
 *     "instance": {
 *       "instanceType": { "node": { ... }, ... },
 *       "node": { ... },
 *       "index": 1
 *     },
 *   }
 * }
 */
contentArray.forEach(content => {
  // NOTE: This condition is for debugging by inserting documents which have been run through this interceptor already
  // into the STAGING database in order to test developing mappings using the DHF GUI
  if (fn.head(content.value.xpath(`root()/envelope/instance/${runKey}`))) {
    trace('Skipping pre-step interceptor "expand-instance" because it looks like the document has already been run through it');

    return; // Skip the pre-step interceptor because it's already been run on the input document
  }

  const doc = content.value;
  const envelope = doc.xpath('root()/envelope').toArray()[0];
  const instance = envelope.xpath('instance').toArray()[0];

  const newInstance = {
    ...instance.toObject(),

    [destination]: doc.xpath('.'),
    [indexDestination]: doc.xpath(`count(preceding-sibling::${siblingName})+1`),

    [runKey]: true,
  };

  content.value = new NodeBuilder().addNode(entireRecord ? { envelope: { ...envelope, instance: newInstance } } : newInstance).toNode();
});
