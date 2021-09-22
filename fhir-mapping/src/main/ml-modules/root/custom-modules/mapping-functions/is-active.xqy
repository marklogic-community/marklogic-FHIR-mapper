xquery version "1.0-ml";

module namespace custom = "http://marklogic.com/mapping-functions/custom";

declare function custom:isActive($effectiveDateString as item()?, $expirationDateString as item()?) as xs:boolean {
    let $_ := xdmp:log("Entering custom:isActive()", "debug")
    return
        if (($effectiveDateString instance of null-node() or fn:string-length($effectiveDateString/fn:normalize-space()) eq 0) and ($expirationDateString instance of null-node() or fn:string-length($expirationDateString/fn:normalize-space()) eq 0)) then
            fn:true()
        else if (($effectiveDateString instance of null-node() or xs:date($effectiveDateString) le fn:current-date()) and ($expirationDateString instance of null-node() or xs:date($expirationDateString) ge fn:current-date())) then
          fn:true()
        else
            fn:false()
};