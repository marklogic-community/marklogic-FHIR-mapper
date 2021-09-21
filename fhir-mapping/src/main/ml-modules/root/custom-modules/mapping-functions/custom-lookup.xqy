xquery version "1.0-ml";

module namespace custom = "http://marklogic.com/mapping-functions/custom";

(:~
 : @param $key the key to lookup in the given map object
 : @param $object the map object that defines key/value pairs
 : @return the value associated with the key, if found
 :)
declare function custom:customLookup($key as item()?, $object) as item()?
{
  (:
  Because this is just syntactic sugar on top of map:get (so that a non-technical user doesn't need to know about map:* functions),
  this is implemented within this module as opposed to the implementation module.
  :)
  let $_ := xdmp:log("Entering custom:customLookup()", "debug")
  return
    map:get($object, $key)
};