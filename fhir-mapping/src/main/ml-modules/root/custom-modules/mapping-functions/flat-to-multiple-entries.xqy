xquery version "1.0-ml";

module namespace custom = "http://marklogic.com/mapping-functions/custom";

declare function custom:flatToMultipleEntries($flatStructure as node()+, $configString as xs:string) as object-node()* {
    let $_ := xdmp:log("Entering custom:flatToMultipleEntries()", "debug")
    let $_ := xdmp:log("$flatStructure: " || xdmp:quote($flatStructure), "debug")
    let $_ := xdmp:log("$configString: " || xdmp:quote($configString), "debug")
    let $config := xdmp:to-json(xdmp:from-json-string($configString))
    let $_ := xdmp:log("$config: " || xdmp:quote($config), "debug")
    let $breakout := $config/breakout
    for $obj in $breakout 
    for $result at $i in $flatStructure/xdmp:value($obj/xpath)
    let $return :=
        object-node { 
            "type": $obj/type, 
            "source": $result, 
            "parent": $result/..
        }
    let $_ := xdmp:log("$return: " || xdmp:quote($return), "debug")
    return $return
};