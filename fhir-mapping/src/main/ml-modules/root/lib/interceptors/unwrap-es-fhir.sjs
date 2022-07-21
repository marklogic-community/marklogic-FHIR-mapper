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
 *   "Organization": {
 *     "type": "Organization"
 *   }
 * }
 *
 * gets flattened to:
 *
 * {
 *   "type": "Organization"
 * }
 *
 * Arrays map each object in the array individually as though it were a single node provided to the function, and
 * primitives are returned as-is
 */
function unwrapES(node) {
  if (Array.isArray(node)) {
    traceObject(node);

    return node.map(unwrapES).filter(useValueInOutput);
  }

  if (typeof node === 'object' && node !== null) {
    traceObject(node);

    const values = Object.values(node);

    if (values.length !== 1) {
      throw new Error(`Expected a single sub-key, got ${values.length} sub-keys ([${Object.keys(node).join(', ')}])`);
    }

    const newNode = values[0];

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
 * Unwrap the ES-FHIR model stored inside the base instance object from a Data Hub envelope to create true FHIR output,
 * e.g.:
 *
 * {
 *   "practitioner": {
 *     "Reference": {
 *       "type": "Practitioner",
 *       "reference": "Practitioner/id"
 *     }
 *   },
 *   "organization": {
 *     "Reference": {
 *       "type": "Organization"
 *     }
 *   },
 *   "location": [
 *     {
 *       "Reference": {
 *         "reference": "Location/id-providerlocations-3"
 *         "type": "Location"
 *       }
 *     }
 *   ]
 * }
 *
 * gets flattened to:
 *
 * {
 *   "practitioner": {
 *     "type": "Practitioner",
 *     "reference": "Practitioner/id"
 *   },
 *   "organization": {
 *     "type": "Organization"
 *   },
 *   "location": [
 *     {
 *       "reference": "Location/id-providerLocations-3",
 *       "type": "Location"
 *     }
 *   ]
 * }
 */
function unwrapBaseInstance(instance) {
  traceObject(instance);

  if (emptyValues.includes(instance)) {
    throw new Error('Expected base instance to be an object, got an empty value');
  }

  if (typeof instance !== 'object') {
    throw new Error(`Expected base instance to be an object, got ${xdmp.quote(instance)}`);
  }

  if (Array.isArray(instance)) {
    throw new Error('Expected a single base instance object, got an array');
  }

  for (const [key, value] of Object.entries(instance)) {
    const res = unwrapES(value);

    instance[key] = useValueInOutput(res) ? res : undefined;
  }

  return instance;
}

/**
 * Unwrap mapping step output from ES-FHIR to true FHIR
 */
contentArray.forEach(content => {
  // Get actual instance (and not the info node) deterministically
  const instanceType = fn.head(content.value.xpath('/envelope/instance/info/title'));
  const instance = fn.head(content.value.xpath(`/envelope/instance/${instanceType}`)).toObject();

  // Force conversion to actual JS types (Object, Array, etc.) instead of using ML builtins which don't map correctly to
  // JS by stringifying/parsing JSON
  content.value = unwrapBaseInstance(JSON.parse(JSON.stringify(instance)));
});
