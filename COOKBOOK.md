# MarkLogic FHIR Mapper Cookbook

## Assumptions
This guide makes some assumptions about developers and projects. These assumptions include:

Your project:
- Either already uses the DHF 5.5, or can continue to operate when DHF 5.5 is installed
- Has records that have already been harmonized, mastered, and stored in a MarkLogic database

Developers:
- Have a basic understanding of the FHIR specification

## What this guide will cover
- How to transform  persistant data stored in a MarkLogic database into FHIR compliant JSON using a DataHub Mapping Step 
- How to create Data Services to support read operations needed for FHRI
- How to connect a HAPI server instance to the data Services

## What this guide won't cover
- How to harmonize or master your data
- How to implement a full fledged FHIR server
  - Only the connection between a HAPI server and a MarkLogic database will be covered
- Details of the FHIR specification
- Details of the HAPI server implementation

## Adding the FHIR Mapper to your project
- Add DHF 5.5 to your MarkLogic project if it does not already exist
- Copy files from the fhir-mapping project into your MarkLogic project
  - ```fhir-mapping/src/main/ml-modules/root/fhir-accelerator``` contains the code that will assist in the conversion from your stored data models to the FHIR Resource JSON.
  - ```fhir-mapping/entities``` contains examples of Data Hub entities that represent the FHIR Resource models. You will also need to create entities for any other FHIR Resources you are planning to serve out of your MarkLogic cluster.

### Mapping your data to FHIR Resource Entities
You can begin by mapping the Entity using the Data Hub Central UI and following the DHF [instructions](https://docs.marklogic.com/datahub/5.5/flows/create-mapping-step-using-hubcentral.html) for the resource Entity you are working on.

### Premapping your data
When is pre-mapping needed?

- Your data is in the DHF envelope format but and you need data from a location that is not contained by ```/envelope/instance``` for example, if you need data that is in the headers section at ```/envelope/headers```
- If there is more than 1 place in a document that the resource can come from, or the resource is a list within the document. For example, if you have a Provider document that has and array of locations where they provide services, when you are mapping a FHIR Location resource you must pre-map the data to only convert the item in the array that you are interested in.
- If you need data from more than 1 document to map a single resource, you can pre-map the data to get the extra documents you need. For example, if you store addresses in a separate document from a Provider, you will need to retrieve that document when converting the Provider into a Practitioner.

#### How to pre-map your documents
Pre-mapping is performed by a JavaScript module located in the ```src/main/ml-modules/root/custom-modules/egress-preprocessors``` folder with a file name of ```{MappingStepName}.sjs```

#### Functions to implement
Required functions:
- ```transform(content)``` which must return a [Node](https://docs.marklogic.com/js/Node).

It is also recomended that you implement the flowing functions to allow you to use the helper functions to load pre-mapped documents into the database for use in the Hub Central mapping UI:
- ```getURI(preMappedContent)``` which returns a String representing the URI the document will be inserted at.
- ```getCollections(preMappedContent)``` which returns an array of Strings representing the collections the document will be inserted with.

#### Pre-mapping helper
A helper is provided to make simple pre-mapping easy. It can be used by importing the helper script:

```javascript
const acceleratorHelper = require("/fhir-accelerator/sub-node-preprocess-helper.sjs");
```

and passing the content object and a paths object where the keys are nodes you want in the new document and the values are the xpath to get the data you want in those keys from the context of what will be passed to be mapped, for example, if you are trying to map a single location in a provider document into a FHIR Location resource, you might write something like this:

```javascript
const paths = {
  document: "root()",
  instance: ".",
  index: "count(preceding-sibling::providerLocations)+1"
}

function transform(content) {
  return acceleratorHelper.basicSubNodeDocument(content, paths)
}
```

This gives our mapping access to:
- The entire document, including any headers we might need
- The particular location that we are trying to map
- The index of that location within the document it came from

#### Testing the pre-mapper
You can test your pre-mapping using qConsole using a script like the one below. Adjust this script to have the content variable containing a sequence of objects that you would want converted into a FHIR resource. In this example, we are getting the list of providerLocations from a single test document, and viewing the pre-mapping of each one.

```javascript
declareUpdate()

const egressMapping = require("/fhir-accelerator/egress-mapping.sjs")

var content = fn.head(fn.doc("/provider/1528354669.json")).xpath("/envelope/instance/provider/providerLocations")

var mappingName = "ProviderToFHIRLocation"

var results = []

for(var node of content) {
  results.push(egressMapping.preMap(node, mappingName))
}

Sequence.from(results)
```

#### Making the pre-mapped documents available to the DHC Mapping UI
You can write your pre-mapped documents to the database using qConsole with a script like the one below. Adjust this script to have the content variable containing a sequence of objects that you would want converted into a FHIR resource. In this example, we are getting the list of providerLocations from a single test document, and writing the pre-mapping of each one back into the database. This will allow  the Mapping UI in DataHub Central to see the pre-mapped source document and properly map it into the FHIR Resource Entities.

```javascript
declareUpdate()

const egressMapping = require("/fhir-accelerator/egress-mapping.sjs")

var content = fn.head(fn.doc("/provider/1528354669.json")).xpath("/envelope/instance/provider/providerLocations")

var mappingName = "ProviderToFHIRLocation"

var results = []

for(var node of content) {
  results.push(egressMapping.writePreMapToDB(node, mappingName))
}

Sequence.from(results)
```

This script depends on the 2 optional functions in the pre-map module.

### Writeing Data Services
Data services are the interface between the client (HAPI) and the Database. For detaild information on defining a Data Service, visit [https://docs.marklogic.com/guide/java/DataServices]

In general, our data services are broken down into 6 sections:
- Build a query based on the input parameters
- Execute the query
- Filter the results (if needed)
- Apply paging based on input parameters
- Transform results into FHIR
- Return final results

#### Input Parameters
In our example project, we used a generic ```search``` parameter that is a stringified JSON object that represents the search to be performed. This JSON object is in the form:

```
[
    {
        "field": "searchfield1",
        "modifier": "optionalmodifier"
        "values": ["value1", "value2"]
    },
    {
        "field": "searchfield2",
        "modifier": "optionalmodifier"
        "values": ["value3", "value4"]
    }
]
```

In adition to the search parameter we included the paging parameters as optional integers.

This is not the only way to pass the search parameters from the client (HAPI) to the Data Service, but it does allow the construction of the query (CTS, Optic, SPARQL, etc.) to be built as a loop over the array of search criteria. For detaild information on input parameters and their types, visit [https://docs.marklogic.com/guide/java/DataServices#id_pgfId-1081233]

#### Output Types
It is recomended that any Data Service function that only returns a single resource (read and vread specifically) be configured to return a document, while a function that can return a list of resources (search) be configured to return an array. This will make parsing the results in the HAPI server easier. For detaild information on input parameters and their types, visit [https://docs.marklogic.com/guide/java/DataServices#id_pgfId-1081252]

#### Generating Data Service Proxies
To generate the Java Proxy classes that interact with the Data Service APIs, you must create and run a Gradle Task which is documented (here)[https://docs.marklogic.com/guide/java/DataServices#id_44346]. An example from this projet is listed below:

```
task generatePractitioner(type: com.marklogic.client.tools.gradle.EndpointProxiesGenTask) {
	serviceDeclarationFile = 'src/main/ml-modules/root/data-services/practitioner/service.json'
}
```

The name and package of the Proxy CLass are determined by the ```$javaClass``` field of the service.json file, while the function name, parameters, and return types are defined in each ```.api``` file.

### Integrating the HAPI server
The HAPI project has defined its own system of how to define what operations are available in your server and what parameters are allowed/required. Read about that (here)[https://hapifhir.io/hapi-fhir/docs/server_plain/resource_providers.html#resource-providers].

To integrate a HAPI Resource Provider with the Data Services you created in the steps above, you will follow these steps:
- Convert the parameters to match your Data Service input parameters (in the examples we build a JSON string that represents the search)
- Call the relevant Data Service function using the Proxy Classes
- Parse the results into HAPIs Resource POJOs. Read about that (here)[https://hapifhir.io/hapi-fhir/docs/model/parsers.html]
- If any result modifiers are present and supported (include or revinclude for example), search for the relevant Resources
- Return a Resource Bundle containing all results