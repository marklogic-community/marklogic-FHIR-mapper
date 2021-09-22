xquery version "1.0-ml";

module namespace custom = "http://marklogic.com/mapping-functions/custom";

(: Avoids converting a JSON document into a map multiple times in the same transaction :)
declare variable $DOCUMENT-LOOKUP-CACHE := map:map();

(:~
 : @param $key the key to lookup in the document identified by dictionary-uri
 : @param $dictionary-uri the URI of a document containing a JSON object
 : @return the value associated with the key, if found; if dictionary-uri does not correspond to a document in the
 : database, then an error is thrown
:)
declare function custom:customDocumentLookup($key as item()?, $dictionary-uri as xs:string?) as item()?
{
  let $_ := xdmp:log("Entering custom:customDocumentLookup()", "debug")
  return
      if (fn:not(fn:doc-available($dictionary-uri))) then
        fn:error((), "Dictionary not found at '" || $dictionary-uri || "'")
      else
        let $map := map:get($DOCUMENT-LOOKUP-CACHE, $dictionary-uri)
        let $map :=
          if (fn:exists($map)) then $map
          else
            let $doc := fn:doc($dictionary-uri)
            let $_ :=
              if (xdmp:node-kind($doc/node()) != "object") then
                fn:error((), "Dictionary at '" || $dictionary-uri || "' is not a JSON Object")
              else ()
    
            let $map := xdmp:from-json($doc)
            let $_ := custom:add-upper-case-entries($map)
            let $_ := map:put($DOCUMENT-LOOKUP-CACHE, $dictionary-uri, $map)
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
