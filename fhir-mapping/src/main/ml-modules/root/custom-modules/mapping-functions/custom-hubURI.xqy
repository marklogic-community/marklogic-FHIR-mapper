xquery version "1.0-ml";

module namespace custom = "http://marklogic.com/mapping-functions/custom";

declare function custom:customHubURI($entity-type as xs:string?) as xs:string?
{
  let $_ := xdmp:log("Entering custom:customHubURI()", "debug")
  return
      if (fn:empty($entity-type) or fn:normalize-space($entity-type) = "") then
        "Unable to generate URI; entity type should not be an empty string"
      else
        "/" || $entity-type || "/" || sem:uuid-string() || ".json"
};