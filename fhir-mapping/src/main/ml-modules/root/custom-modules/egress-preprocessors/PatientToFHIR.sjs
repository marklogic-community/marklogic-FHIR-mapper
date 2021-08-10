const acceleratorHelper = require("/fhir-accelerator/sub-node-preprocess-helper.sjs");

const paths = {
  document: "/",
  instance: "/envelope/instance"
}

function transform(content) {
  return acceleratorHelper.basicSubNodeDocument(content, paths)
}

function getURI(preMappedContent) {
  uriRoot = "/pretransformed/member/"
  uriExtension = ".json"

  var providerId = fn.head(preMappedContent.xpath("document/envelope/headers/metadata/publicID"))

  uri = uriRoot + providerId + uriExtension

  return uri
}

function getCollections(conent) {
  return ["pretransformed", "pretransformed-Member"]
}

module.exports = {
  transform: transform,
  getURI: getURI,
  getCollections: getCollections
}
