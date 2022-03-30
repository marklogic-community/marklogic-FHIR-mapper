'use strict';
const { getTraceHelpers } = require('/lib/util/trace-helpers.sjs');

var contentArray;
var options;

var entireRecord;
var destination;
var siblingNames;

const { trace, traceObject } = getTraceHelpers('expand-instance');

traceObject(contentArray);
traceObject(options);

const interceptorRun = '__expand-instance__';

// Add default values to variables
entireRecord = entireRecord || false;
destination = destination || 'subnode';

const indicesName = `${destination}Indices`;

/**
 * Adds the provided node(s) to the original envelope/instance of the document it was pulled from
 * along with its XQuery index for reference, e.g.:
 *
 * ({
 *   "envelope": {
 *     "headers": { ... },
 *     "triples": [...],
 *     "instance": {
 *       "instanceType": { "array": [0, 1, 2, 3, ...], ... },
 *     },
 *   }
 * }).xpath('/envelope/instance/instanceType/array')
 *
 * with provided variables
 *
 * {
 *   "entireRecord": true,
 *   "destination": "node",
 *   "siblingNames": "array",
 * }
 *
 * becomes
 *
 * {
 *   "envelope": {
 *     "headers": { ... },
 *     "triples": [...],
 *     "instance": {
 *       "instanceType": { "array": [0, 1, 2, 3, ...], ... },
 *       "node": 0,
 *       "nodeIndices": {
 *         "array": 1
 *       }
 *     },
 *   }
 * }
 */
contentArray.forEach(content => {
  // NOTE: This condition is for debugging by inserting nodes which have been run through this interceptor already
  // into the STAGING database in order to test developing mappings using the DHF GUI
  if (fn.head(content.value.xpath(`root()/envelope/instance/${interceptorRun}`))) {
    trace('Skipping "expand-instance": processed earlier');

    return; // Skip the pre-step interceptor because it's already been run on the input node
  }

  const doc = content.value;
  const envelope = fn.head(doc.xpath('root()/envelope'));
  const instance = fn.head(envelope.xpath('instance'));

  const newInstance = {
    // Put all of the original document /envelope/instance into the new instance
    ...instance.toObject(),

    // Add the subnode provided to this interceptor
    [destination]: doc.xpath('.'),
    // If siblingNames are provided, add indices for the various sibling node names provided. Otherwise, don't insert an
    // extraneous empty node into the instance.
    ...(siblingNames
      ? {
        // [].concat(array-or-individual) guarantees we aren't spreading each character of a string into an array, e.g.:
        //   [].concat(['dave', 'grohl']) -> ['dave', 'grohl']
        //   [].concat(['dave grohl']) -> ['dave grohl']
        //   [].concat('dave grohl') -> ['dave grohl']
        [indicesName]: [].concat(siblingNames).reduce(
          // For each sibling that we're getting an index for, add it to an accumulator object which will be put into
          // the indices node of the result
          (acc, sibling) => ({ ...acc, [sibling]: fn.head(doc.xpath(`count(preceding-sibling::${sibling})+1`)) }),
          {},
        ),
      }
      : undefined
    ),

    // NOTE: For debugging purposes, add a way to determine that this interceptor has already been run so that when
    // running against pre-transformed nodes inserted into STAGING, we don't attempt to process them again and have a
    // node with everything important nested under /envelope/instance/envelope/instance/...
    [interceptorRun]: true,
  };

  content.value = new NodeBuilder().addNode(entireRecord ? { envelope: { ...envelope, instance: newInstance } } : newInstance).toNode();
});
