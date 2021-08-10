const acceleratorHelper = require("/fhir-accelerator/sub-node-preprocess-helper.sjs");

const paths = {
  document: "root()",
  node: ".",
  index: "count(preceding-sibling::providerAffiliations)+1"
}

function transform(content) {
  return acceleratorHelper.basicSubNodeDocument(content, paths)
}

function getURI(preMappedContent) {
  uriRoot = "/pretransformed/providerAffiliation/"
  uriExtension = ".json"

  var providerId = fn.head(preMappedContent.xpath("document/envelope/headers/metadata/publicID"))
  var index = fn.head(preMappedContent.xpath("index"))

  uri = uriRoot + providerId + "/" + index + uriExtension

  return uri
}

function getCollections(conent) {
  return ["pretransformed", "pretransformed-ProviderAffiliation"]
}

module.exports = {
  transform: transform,
  getURI: getURI,
  getCollections: getCollections
}
