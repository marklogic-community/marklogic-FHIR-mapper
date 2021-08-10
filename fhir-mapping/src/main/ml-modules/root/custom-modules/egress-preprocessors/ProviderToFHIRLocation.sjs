const acceleratorHelper = require("/fhir-accelerator/sub-node-preprocess-helper.sjs");

const paths = {
  document: "root()",
  providerLocations: ".",
  index: "count(preceding-sibling::providerLocations)+1"
}

function transform(content) {
  return acceleratorHelper.basicSubNodeDocument(content, paths)
}

function getURI(preMappedContent) {
  uriRoot = "/pretransformed/providerLocation/"
  uriExtension = ".json"

  var providerId = fn.head(preMappedContent.xpath("document/envelope/headers/metadata/publicID"))
  var index = fn.head(preMappedContent.xpath("index"))

  uri = uriRoot + providerId + "/" + index + uriExtension

  return uri
}

function getCollections(conent) {
  return ["pretransformed", "pretransformed-ProviderLocation"]
}

module.exports = {
  transform: transform,
  getURI: getURI,
  getCollections: getCollections
}
