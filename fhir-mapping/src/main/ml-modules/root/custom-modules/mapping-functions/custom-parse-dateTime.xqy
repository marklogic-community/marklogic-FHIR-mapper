xquery version "1.0-ml";

module namespace custom = "http://marklogic.com/mapping-functions/custom";

declare function custom:customParseDateTime($value as xs:string?, $pattern as xs:string?) as xs:string?
{
  let $_ := xdmp:log("Entering custom:customParseDateTime", "debug")
  return
      if (fn:not(fn:normalize-space($value)) or fn:not($value)) then ()
      else
        let $error-message := "The pattern '" || $pattern || "' cannot be applied to the value '" || $value || "'"
        let $pattern := fn:normalize-space($pattern)
    
        let $formats-with-misused-day-indicator := ("YYYYMMDDThhmmss", "DD/MM/YYYY-hh:mm:ss", "DD/MM/YYYY hh:mm:ss", "YYYY/MM/DD-hh:mm:ss" , "YYYY/MM/DD hh:mm:ss")
        let $pattern :=
          if ($pattern = $formats-with-misused-day-indicator) then fn:replace($pattern, "DD", "dd")
          else $pattern
    
        let $pattern := fn:replace($pattern, "YYYY", "yyyy")
    
        return try {
          fn:string(xdmp:parse-yymmdd($pattern, $value))
        } catch ($error) {
          $error-message
        }
};
