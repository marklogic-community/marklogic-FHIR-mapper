// core data hub mapping invocation function library. TODO: ensure we use a public, documented function.cts
const mapping = require('/data-hub/5/builtins/steps/mapping/entity-services/main.sjs')

/** 
 * When the persistent doc matching the search is not appropriate to transform, there may be
 * a pre-processing function defined. This is defined by module naming convention where the .sjs 
 * module matches the Step name that will be used to do the transform. 
 * 
 * Common preprocessing is to join all relevant data together using new queries based on IDs or RDF, or
 * to dig down into a larger object for the sub-objects actually being queried. Also, related data from 
 * headers or metadata may be added to a larger structure that is needed in the mapping step.
 * 
 * @param {ObjectNode} rawDoc the persistent Object to pre-process
 * @param {string} entityToFHIRStepName the name of the step that will do the mapping after this pre-processing;
 *                    the name of the Step must match the module name of the pre-processing .sjs module
 */
function preMapProcess(rawDoc, entityToFHIRStepName) {
  var premappingModulName = "/custom-modules/egress-preprocessors/" + entityToFHIRStepName + ".sjs"
  var premappingModule = null
  try {
    premappingModule = require(premappingModulName)
  } catch (e) {
    //no preprocessor, which is ok
  }
  if(premappingModule != null) {
    return premappingModule.transform(rawDoc)
  } else {
    return rawDoc
  }
}

/**
 *  * Find persistent objects on disk and if necessary, xpath down to the matching sub-objects
 * @param {cts.query} docQuery - query to find matching documents on disk
 * @param {cts.query} itemQuery - query to find matching items within a doc (often the same as docQuery) 
 * @param {string} xpath - which matching items to consider with itemQuery
 * @param {string} entityToFHIR - name of the Step to run to transform the data to FHIR. Also name of the pre-processing module if any.
 * @param {int} start - first result of N matching results to return (paging start)
 * @param {int} limit - max number of items to return after start (paging end = start+limit)
 * @returns {Array} - return FHIR-compliant content as defined by the pre-processor + mapping step. Regular JSON, not ObjectNode wrapeprs.
 */
 function queryAndMap(docQuery, itemQuery, xpath, entityToFHIRStepName, start, limit) {
  let rawDocs = findRawObjects(docQuery, itemQuery, xpath, start, limit)
  let transformedArray = rawDocs.map(rawDoc => {
    let preMappedConent = preMapProcess(rawDoc, entityToFHIRStepName) 
    let mappedConent = applyStepMapping(preMappedConent, entityToFHIRStepName) // apply the Step mapping, creating envelope{ headers: triples: instance:}
    let jsonInstance = mappedConent.toObject().envelope.instance // convert from ObjectNode to regular JS and get the instance
    let transformedItem = unwrapES(jsonInstance) 
    return transformedItem
  })
  return transformedArray
}

/**
 * Find persistent objects on disk and if necessary, xpath down to the matching sub-objects within them
 * see queryAndMap() for param descriptions
 */
function findRawObjects(docQuery, itemQuery, xpath, start, limit) {

  const searchResults = cts.search(docQuery); // a generator. Access only via fn.suubsequence() to avoid too much data being retrieved

  // Apply database paging logic. We don't know exactly how many containing persistent docs we need
  // but it will be at most the number of sub-docs needed
  const rawDocs = fn.subsequence(searchResults, 0, start+limit) 

  // Extract matching sub-objects. 
  // Note: to use cts.contains() and xpath() we need the Node sublcass representation of the persisted JSON, not simple JSON
  var items = [];
  for (const rawDoc of rawDocs) {
    for (const item of rawDoc.xpath(xpath)) {
      if (cts.contains(item, cts.andQuery(itemQuery))) {
        items.push(item);    // Note: we could optimized to break after limit matches
      }
    }
  }
  // apply per-item paging logic now that we have the full list
  items = items.slice(start, start+limit) 
  return items
}


function unwrapEnvelopeDoc(doc) {
  return unwrapES(doc.toObject().envelope.instance)
}

/**
 *  For Entity Services compliant objects, removes extra wrapping of each sub-item in a property indicating 
 *  item type, emoves the info: property, and removes $ref properties, and removes null value props
 * @param esJSON Entity Services compliant data structure
 * @returns a flattened or simplified structure without additional Entity Services structures
 */
function unwrapES(esJSON) {
  if (esJSON instanceof Array) {
    return esJSON.map(unwrapES)
  } else if (esJSON instanceof Object) {
    let instanceKey = Object.keys(esJSON).find(element => element != "info")
    let newObject = esJSON[instanceKey]
    for (let child in newObject) {
      newObject[child] = unwrapES(newObject[child])
      if(newObject[child] == null) {
        delete newObject[child]
      }
    }
    if(newObject.hasOwnProperty('$ref')) {
      return null
    }
    return newObject
  } else {
    return esJSON
  }
}

///// -------------------------------------------------------------------------------///
///// ---------------------- Query building helper functions ------------------------///

/**
 * Helper function to take standard searchCriteria corresponding to the Java SearchCriteria structure, and combine that with a Step collection 
 * name, FHIR search options (exact or contains; null means startsWith) and any additional query (optional) and return the overal AND query to 
 * satisfy those criteria.
 * @param searchCriteria  Array of {field: modifier: values: []} objects
 * @param collectionName  Documents that match must be in this collection
 * @param additionalQuery  An additional query constraint (can itself be an AND query)
 * @param searchOptions  valueQuery options for each value in the conjunct. One of exact or contains or null.
 * @returns 
 */
 function buildQuery(searchCriteria, collectionName, additionalCtsQuery, searchOptions) {
  let conjuncts = searchCriteria.map(  // gather the criteria for various search fields and values
        (crit) => {
          const searchValues = egress.wildcardedQueryValues(crit.values, crit.modifier) // TODO: names and text only?
          return cts.jsonPropertyValueQuery(fieldMap.get(crit.field), searchValues, searchOptions)
        })
  if (collectionName!=null) conjuncts.push(cts.collectionQuery(collectionName))
  if (additionalCtsQuery!=null) conjuncts.push(additionalCtsQuery)
  const query = cts.andQuery(conjuncts)
  xdmp.log("built a query for documents: "+ xdmp.quote(query), "debug")
  return query
}

/**
 * Changes values to wildcarded versions such as "foo" --> "*foo*" when the modifier is "contains"
 * @param {Array[string]} values 
 * @param {string} modifier - one of exact or contains or null (null means starts-with)
 * @returns MarkLogic style wildcard string to indicate exact match, contains match or starts-with match
 */
function wildcardedQueryValues(values, modifier) {
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

/**
 * Convenience function to add a preprocessed document to the database, which allows the Mapping Step
 * GUI to access the document for reference and testing during the mapping process.
 * @param {DocumentNode} content a document from the database. MarkLogic wrapper class, not simple JSON content.
 * @param {string} entityToFHIRStepName the name of the step that will be run. By convention, the preprpocessing module 
 *                                      must have the same name. 
 */
function writePreMapToDB(content, entityToFHIRStepName){
  let premappingModulName = "/custom-modules/egress-preprocessors/" + entityToFHIRStepName + ".sjs"
  const premappingModule = require(premappingModulName)

  // the module must have these three functions, or we error out and cannot stage a preprocessed document
  let newDocument = premappingModule.transform(content)
  let collections = premappingModule.getCollections(newDocument)
  let uri = premappingModule.getURI(newDocument)

  // to ensure the new document is as accessible as the non-preprocessed document, use the same perms
  let perms = xdmp.getDocumentPermissions(content)

  xdmp.documentInsert(uri, newDocument, {permissions : perms, collections : collections})
}

function applyStepMapping(content, mappingName) {
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

module.exports = {
  writePreMapToDB,
  queryAndMap,
  wildcardedQueryValues: wildcardedQueryValues,
  modifierPrefixMap, // TODO consider adding higher level function to build a search
  buildQuery
}
