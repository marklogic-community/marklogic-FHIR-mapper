'use strict';
const { getTraceHelpers } = require('/lib/util/trace-helpers.sjs');

var contentArray;
var options;

const { trace, traceObject } = getTraceHelpers('unwrap-es-fhir');

traceObject(contentArray);
traceObject(options);

const emptyValues = ['', null, undefined];

// Filter empty (but not false) values from FHIR output
function useValueInOutput(v) {
  return v instanceof Array ? v.length > 0 : !emptyValues.includes(v);
}

/**
 * Recursively unwrap our stored ES-FHIR model to create true FHIR output, e.g.:
 *
 * {
 *   "organization": { "Organization": { ... } },
 *   "location": { "Reference": { ... } },
 *   ...
 * }
 *
 * gets flattened to
 *
 * {
 *   "organization": { ... },
 *   "location": { ... },
 *   ...
 * }
 */
function unwrapES(node) {
  if (Array.isArray(node)) {
    return node.map(unwrapES).filter(useValueInOutput);
  }

  if (typeof node === 'object') {
    const instanceKey = Object.keys(node).find(element => element != "info");
    const newNode = node[instanceKey];

    if (newNode.hasOwnProperty('$ref')) {
      return null;
    }

    for (const [key, value] of Object.entries(newNode)) {
      const res = unwrapES(value);

      newNode[key] = useValueInOutput(res) ? res : undefined;
    }

    return newNode;
  }

  return node;
}

/**
 * Unwrap mapping step output from ES-FHIR to true FHIR
 */
contentArray.forEach(content => {
  // Force conversion to actual JS types (Object, Array, etc.) instead of using ML builtins which don't map correctly to
  // JS by stringifying/parsing JSON
  content.value = unwrapES(JSON.parse(JSON.stringify(content.value.toObject().envelope.instance)));
});
