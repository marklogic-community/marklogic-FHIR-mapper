const mapping = require('/data-hub/5/builtins/steps/mapping/entity-services/main.sjs')

function preMapMapAndUnwrap(content, mapping) {
  var preMappedConent = preMap(content, mapping)
  return mapAndUnwrap(preMappedConent, mapping)
}

/**
 * The Hub Central mapping steps are 1:1 transforms which sometimes require a sub-document or joined document
 * different from the persistent documents. This function applies a pre-mapping function to return the appropriate 
 * data so the mapping step can work.
 * 
 * @param content the persistent document to map into a form suitable for the mapping step
 * @param mapping String name of the mapping step. Used by convention to look up the pre-mapping function.
 * @returns a new document Node representing the 'pre-mapped' content
 */
function preMap(content, mapping) {
  var premappingModulName = "/custom-modules/egress-preprocessors/" + mapping + ".sjs"
  var premappingModule = null
  try {
    premappingModule = require(premappingModulName)
  } catch (e) {
    //no preprocessor
  }
  if(premappingModule != null) {
    return premappingModule.transform(content)
  } else {
    return content
  }
}

/**
 * Stores data in the database that has a 'pre-mapping' applied to it. The name (string) of the Mapping Step
 * is used to look up a module with all of: transform(), getCollections() and getURI() functions. The transform()
 * will be applied to the content input parameter, and the result stored at getURI() with the collections returned
 * by getCollections().
 * 
 * Note this currently sets the default permissions of the current user on the inserted document, so some
 * users (e.g. admin) can run this to create sample documents that will not show up for users running the 
 * Hub Central mapper.
 * 
 * @param content A persistent document to start with
 * @param mapping The string name of the Mapping Step to pre-process for
 */
function writePreMapToDB(content, mapping){
  var premappingModulName = "/custom-modules/egress-preprocessors/" + mapping + ".sjs"
  const premappingModule = require(premappingModulName)

  var newDocument = premappingModule.transform(content)
  var collections = premappingModule.getCollections(newDocument)
  var uri = premappingModule.getURI(newDocument)

  xdmp.documentInsert(uri, newDocument, {permissions : xdmp.defaultPermissions(), collections : collections})
}

function mapAndUnwrap(content, mapping) {
  var mappedConent = map(content, mapping)
  return unwrapEnvelopeDoc(mappedConent)
}

function map(content, mappingName) {
  var doc = {
    'value': content
  }

  var options = {
    'mapping': {
      'name': mappingName
    }
  }

  return mapping.main(doc, options).value
}

function unwrapEnvelopeDoc(doc) {
  return unwrapES(doc.toObject().envelope.instance)
}

/**
 * Recursively strip out Entity-services specific properties and nesting.
 * Entity Services often has extra levels of nesting, an info: property and some $ref properties. 
 * This is because Entity Services models always wrap a Structured Type with the Structured Type name 
 * 
 * (e.g. {person: name: {NameStruct: {...}}}) and often a version is needed without the type (NameStruct).
 * @param node 
 * @returns 
 */
function unwrapES(node) {
  if (node instanceof Array) {
    return node.map(unwrapES)
  } else if (node instanceof Object) {
    var instanceKey = Object.keys(node).find(element => element != "info")
    var newNode = node[instanceKey]
    for (var child in newNode) {
      newNode[child] = unwrapES(newNode[child])
      if(newNode[child] == null) {
        delete newNode[child]
      }
    }
    if(newNode.hasOwnProperty('$ref')) {
      return null
    }
    return newNode
  } else {
    return node
  }
}

/**
 * @param rawDocs array of documents to transform
 * @param entityToFHIR  name of the Mapping Step to run (along with associated pre-map transform if any)
 * @returns a new Node representing the transformed JSON document
 */
function transformMultiple(rawDocs, entityToFHIR) {
  var egressedDoc = []

  for (var rawDoc of rawDocs) {
    egressedDoc.push(preMapMapAndUnwrap(rawDoc, entityToFHIR))
  }
  return egressedDoc;
};

/**
 * Converts an array of values with a modifier of exact or contains to an array of wildcarded matches.
 * E.g. f(['foo', 'bar'], 'contains') becomes ['*foo*', '*bar*']
 * Without any modifier (null or unrecognized modifier) the default behavior of trailing wildcard is used: ';foo*'
 * @param values 
 * @param modifier 
 * @returns 
 */
function searchValuesWithModifier(values, modifier) {
  switch (modifier) {
    case "exact":
      return values;
    case "contains":
      return values.map(value => "*" + value + "*");
    default:
      return values.map(value => value + "*");
  }
}

const modifierPrefixMap = new Map([
  ['eq', '='],
  ['ne', '!='],
  ['lt', '<'],
  ['le', '<='],
  ['gt', '>'],
  ['ge', '>='],
  ['sa', '>'],
  ['eb', '<']
]);

module.exports = {
  mapAndUnwrap,
  preMap,
  writePreMapToDB,
  preMapMapAndUnwrap,
  transformMultiple,
  searchValuesWithModifier,
  modifierPrefixMap
}
