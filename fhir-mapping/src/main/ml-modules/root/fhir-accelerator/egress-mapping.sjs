const Artifacts = require('/data-hub/5/artifacts/core.sjs');
const FlowExecutionContext = require('/data-hub/5/flow/flowExecutionContext.sjs');
const StepExecutionContext = require('/data-hub/5/flow/stepExecutionContext.sjs');
const flowRunner = require('/data-hub/5/flow/flowRunner.sjs');

const cachedFlowExecutionContexts = new Map();

function getStepExecutionContextForMapping(mapping) {
  // If there is no cached FlowExecutionContext for the given mapping
  if (!cachedFlowExecutionContexts.has(mapping)) {
    const name = `in-memory-${mapping}-flow`;

    // Create a FlowExecutionContext for a single-step flow with the mapping
    cachedFlowExecutionContexts.set(mapping, new FlowExecutionContext({
      name,
      batchSize: 100,
      threadCount: 4,
      stopOnError: false,
      version: 0,
      steps: { '1': Artifacts.convertStepReferenceToInlineStep(`${mapping}-mapping`, name), },
    }));
  }

  // Create a new StepExecutionContext for the cached FlowExecutionContext for the given mapping
  return StepExecutionContext.newContext(cachedFlowExecutionContexts.get(mapping), '1');
}

/**
 * Check to see if an object is iterable and can be spread into an array
 *
 * @param  {unknown}   obj  The object
 *
 * @return {boolean}  True if the specified object is iterable, False otherwise.
 */
function isIterable(obj) {
  return !!obj && typeof obj[Symbol.iterator] === 'function';
}

/**
 * Run any configured pre-step interceptors from the mapping step on the provided document(s)
 *
 * @param  {Node[] | Sequence<Node> | object} docs    The document(s) to process
 * @param  {string}                           mapping The name of the mapping to use
 *
 * @return {Node[]}
 */
function runPreStepInterceptorOnDocuments(docs, mapping) {
  // Create a contentArray so that we can pull the processed documents back out after running interceptors
  const contentArray = (isIterable(docs) ? [...docs] : [docs]).map(value => ({ value }));

  // Run the mapping step's pre-step interceptors against the provided documents
  flowRunner.invokeInterceptors(getStepExecutionContextForMapping(mapping), contentArray, 'beforeMain');

  // Return the processed values
  return contentArray.map(entry => entry.value);
}

/**
 * Run the entire mapping step on the provided document(s)
 *
 * @param  {Node[] | Sequence<Node> | object} docs    The document(s) to process
 * @param  {string}                           mapping The name of the mapping to use
 *
 * @return {Node[]}
 */
function transform(docs, mapping) {
  // Get mapping step execution context to run against
  const stepExecutionContext = getStepExecutionContextForMapping(mapping);

  // Run the mapping step without attempting to write output to a DB
  const res = flowRunner.runStepAgainstSourceDatabase(stepExecutionContext, (isIterable(docs) ? [...docs] : [docs]).map(value => ({ value })), null);

  // Step execution context encountered errors while running
  if (stepExecutionContext.stepErrors.length) {
    // Report the first mapping error without any of the internal DHF stack trace
    throw stepExecutionContext.stepErrors[0].message;
  }

  // Return the mapped values
  return res.map(entry => entry.value);
}

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
  runPreStepInterceptorOnDocuments,
  transform,
  searchValuesWithModifier,
  modifierPrefixMap,
}
