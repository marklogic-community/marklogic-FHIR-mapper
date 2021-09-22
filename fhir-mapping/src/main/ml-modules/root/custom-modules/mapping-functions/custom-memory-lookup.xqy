xquery version "1.0-ml";

module namespace custom = "http://marklogic.com/mapping-functions/custom";

(: Avoids compiling a JSON string into a map multiple times in the same transaction :)
declare variable $MEMORY-LOOKUP-CACHE := map:map();

(:~
 : @param $key the key to lookup in the given dictionary
 : @param $dictionary a string containing a JSON object that defines keys and values
 : @return the value associated with the key, if found
 :)
declare function custom:customMemoryLookup($key as item()?, $dictionary as xs:string?) as item()?
{
  let $_ := xdmp:log("Entering custom:customMemoryLookup", "debug")
  let $map := map:get($MEMORY-LOOKUP-CACHE, $dictionary)
  let $map :=
    if (fn:exists($map)) then $map
    else
      let $map := xdmp:from-json-string($dictionary)
      let $_ := custom:add-upper-case-entries($map)
      let $_ := map:put($MEMORY-LOOKUP-CACHE, $dictionary, $map)
      return $map

  return map:get($map, fn:upper-case($key))
};

(:
This is done to preserve case-insensitive lookups, though it's not yet clear if we should be doing that;
it's not documented at https://docs.marklogic.com/datahub/5.5/flows/dhf-mapping-functions.html . It blocks users
from having e.g. "d" and "D" dictionary entries, which would be useful for a dictionary that defines different types
of date format characters ("d" = day of month, "D" = day of year).
:)
declare private function custom:add-upper-case-entries($map)
{
  for $key in map:keys($map)
  return map:put($map, fn:upper-case($key), map:get($map, $key))
};