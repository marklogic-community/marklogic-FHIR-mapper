
const defaultRootXpath = "/"

/**
 * Build a JSON Node structure using a template, by Xpathing into a content object to get bits of data.
 * 
 * @param content an initial object; typically a persistent node from the database
 * @param options a JSON template. The value in the options JSON is an xpath expression, and 
 *    the value will be replaced by executing the xpath on the content object.
 *    so {foo: '//somenode'} will result in {foo: somenode: {...}}.
 * @returns A new document Node (vs a simple JSON object) representing the JSON template.
 */
function basicSubNodeDocument(content, options) {

  var newDocumentNode = {}

  for (const [key, value] of Object.entries(options)) {
    newDocumentNode[key] = content.xpath(value) // for every property in the options template, put the xpath result in the new document
  }

  // now convert the resulting JSON object into a Node structure using a NodeBuilder()
  const builder = new NodeBuilder()
  builder.startDocument()
  builder.addNode(newDocumentNode)
  builder.endDocument()
  var newDocument = builder.toNode()

  return newDocument
}

module.exports = {
  basicSubNodeDocument: basicSubNodeDocument
}
