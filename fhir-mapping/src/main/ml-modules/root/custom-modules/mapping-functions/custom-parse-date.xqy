xquery version "1.0-ml";

module namespace custom = "http://marklogic.com/mapping-functions/custom";

declare variable $NON-STANDARD-FORMATS := map:new((
  map:entry("Mon DD,YYYY", "^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ([0-9]|[0-2][0-9]|[3][0-1]),([0-9]{4})$"),
  map:entry("DD Mon YYYY", "^([0-9]|[0-2][0-9]|[3][0-1]) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ([0-9]{4})$"),
  map:entry("DD-Mon-YYYY", "^([0-9]|[0-2][0-9]|[3][0-1])-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-([0-9]{4})$")
));

(: Used in support of "non standard" date formats :)
declare variable $MONTH-MAP := map:new((
  map:entry("JAN", "01"),
  map:entry("FEB", "02"),
  map:entry("MAR", "03"),
  map:entry("APR", "04"),
  map:entry("MAY", "05"),
  map:entry("JUN", "06"),
  map:entry("JUL", "07"),
  map:entry("AUG", "08"),
  map:entry("SEP", "09"),
  map:entry("OCT", "10"),
  map:entry("NOV", "11"),
  map:entry("DEC", "12")
));

declare function custom:customParseDate($value as xs:string?, $pattern as xs:string?) as xs:string?
{
  let $_ := xdmp:log("Entering custom:customParseDate", "debug")
  return
      if (fn:not(fn:normalize-space($value)) or fn:not($value)) then ()
      else
        let $error-message := "The pattern '" || $pattern || "' cannot be applied to the value '" || $value || "'"
        let $pattern := fn:normalize-space(fn:replace($pattern, ", ", ","))
        let $value := fn:replace($value, ", ", ",")
        return try {
          if ($pattern = map:keys($NON-STANDARD-FORMATS)) then
            custom:parse-non-standard-date($value, $pattern)
          else
            custom:parse-standard-date($value, $pattern)
        } catch ($error) {
          $error-message
        }
};

declare private function custom:parse-standard-date($value as xs:string?, $pattern as xs:string?) as xs:string?
{
  (:
  The original SJS impl had a notion of 'standard formats', which boiled down to allowing a user to improperly
  use 'DD' instead of 'dd'. We still need to support that for the given formats below.
  :)
  let $pattern :=
    if ($pattern = ("MM/DD/YYYY", "DD/MM/YYYY", "MM-DD-YYYY", "MM.DD.YYYY", "DD.MM.YYYY", "YYYYMMDD", "YYYY/MM/DD")) then
      fn:replace($pattern, "DD", "dd")
    else $pattern

  let $picture := fn:tokenize(fn:replace($pattern, "YYYY", "yyyy"), "T")[1]
  return xs:string(xs:date(xdmp:parse-yymmdd($picture, $value)))
};

declare private function custom:parse-non-standard-date($value as xs:string?, $pattern as xs:string?) as xs:string?
{
  let $date-pattern := map:get($NON-STANDARD-FORMATS, $pattern)
  where $date-pattern and fn:matches($value, $date-pattern, "i")
  return
    if ($pattern = "Mon DD,YYYY") then
      let $month := map:get($MONTH-MAP, fn:upper-case(fn:substring($value, 1, 3)))
      let $day := fn:substring($value, 5, 2)
      let $year := fn:substring($value, 8, 4)
      return xs:string(xs:date(xdmp:parse-yymmdd("yyyy-MM-dd", fn:string-join(($year, $month, $day), "-"))))
    else
      let $month := map:get($MONTH-MAP, fn:upper-case(fn:substring($value, 4, 3)))
      let $day := fn:substring($value, 1, 2)
      let $year := fn:substring($value, 8, 4)
      return xs:string(xs:date(xdmp:parse-yymmdd("yyyy-MM-dd", fn:string-join(($year, $month, $day), "-"))))
};