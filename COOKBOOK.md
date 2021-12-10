# MarkLogic FHIR Mapper Cookbook

See the README for basic information about the nature of this project, and how to set it up. This document descries how to extend the project and get it working wity your own data set.

## Assumptions
This guide makes some assumptions about developers and projects. These assumptions include:

You have a MarkLogic database project and it:
- Either already uses the DHF 5.5, or can continue to operate when DHF 5.5 is installed
- Has records that have already been harmonized, mastered, and stored in a MarkLogic database

Developers:
- Have a basic understanding of the FHIR specification

## What this guide will cover
- How to transform  persistent data stored in a MarkLogic database into FHIR compliant JSON using a DataHub Mapping Step 
- How to create Data Services to support read operations needed for FHRI
- How to connect a HAPI server instance to the data Services

## What this guide won't cover
- How to harmonize or master your data
- How to implement a full fledged FHIR server
  - Only the connection between a HAPI server and a MarkLogic database will be covered
- Details of the FHIR specification
- Details of the HAPI server implementation

## Adding the FHIR Mapper to your project
You can run this project as is with provided test data, but for actual production use you should merge the libraries from this project, and possibly the provided FHIR data models, in with your code in your own project.

- Add DHF 5.5 to your MarkLogic project if it does not already exist
- Copy files from the fhir-mapping project into your MarkLogic project
  - ```fhir-mapping/src/main/ml-modules/root/fhir-accelerator``` contains the code that will assist in the conversion from your stored data models to the FHIR Resource JSON.
  - ```fhir-mapping/entities``` contains a few Data Hub entities that represent the FHIR Resource models. You will also need to create entities for any other FHIR Resources you are planning to serve out of your MarkLogic cluster.

### Modeling Resource Entities
The FHIR-mapper works by mapping data from your persistent document formats to an Entity Services (ES) model representing a FHIR resource. Four (at this writing) ES models are provided (Location, Patient, Pratcitioner and PractitionerRole). You may need to add more models. 

Entity services models produce JSON with a wrapper property around all sub-structures, which makes querying easer. To produce true FHIR formatted JSON there is a function egress-mapping.unwrapEnvelopeDoc() that removes this extra level of nesting.

Review the FHIR specifications, and create a new Entity Services model using the DHF modeling tool. Alternatively, some customers automate some or all of the conversion from the FHIR JSON schema that is provided to the Entity Services format (contact MarkLogic for recommendations or code to convert JSON Schema to Entity Services). Manual adjustments to an auto-converted ES model may be needed.


### Mapping your data to FHIR Resource Entities
Because your data will be different from the sample data in the project, you must map your data (documents) to FHIR-based Entity Services models. You can do this by mapping your persistent documents (after applying a pre-mapping if any) using the Data Hub Central UI and following the DHF [instructions](https://docs.marklogic.com/datahub/5.5/flows/create-mapping-step-using-hubcentral.html) for the resource Entity you are working on.

### Premapping your data
Pre-mapping is the process of pre-processing a record or records in the database before running the DHF mapping that will convert the data to the FHIR format. The FHIR Accelerator libraries will apply the pre-mapper (if it exists) to a document before passing the result on to a DHF mapping for actual transformation to FHIR.  

When is pre-mapping needed?

- Your data is in the DHF (Entity Services) envelope format and you need data from a location that is not contained by ```/envelope/instance``` for example, if you need data that is in the headers section at ```/envelope/headers```.
- The mapping only applies to a substructure of an overall document in your database. For example, if you have a Provider document that has an array of Locations where they provide services, when you are mapping to a single FHIR Location resource you must pre-map the overall Provider document to only the specific Location item you are interested in. (This exact situation is in the provided sample data and mappings)
- If you need data from more than 1 document to map to a single resource. In this case, you can pre-map the data to get the extra documents you need and combine into one JSON record that will then be mapped by a DHF mapping you build. For example, if you store addresses in a separate document from a Provider, you will need to retrieve that document when converting the Provider into a Practitioner.

Pre mapping in these cases is needed because the DHF mappings are 1:1, so require a single input document to map, and restrict mappings to the “instance” property if the data in in Entity Services envelope format. If you have many documents, many sub-objects within a document, or data outside the instance, you must pre-map.

#### How to pre-map your documents
The FHIR Mapper knows to pick up a pre-mapping transform using a naming convention based on the name of the mapping step you configure. The pre-mapping JavaScript module must be located in the ```src/main/ml-modules/root/custom-modules/egress-preprocessors``` folder and must have a file name of ```{MappingStepName}.sjs``` where MappingStepName is the name of the mapping you will configure in the DHF mapping GUI.

#### Functions to implement
One required function must be implemented in the pre-mapping .sjs module:
- ```transform(content)``` which must return a [Node](https://docs.marklogic.com/js/Node).

The flowing functions are recommended, and allow you to use the helper functions to load pre-mapped documents into the database for use in the Hub Central mapping UI:
- ```getURI(preMappedContent)``` which returns a String representing the URI the document will be inserted at.
- ```getCollections(preMappedContent)``` which returns an array of Strings representing the collections the document will be inserted with.

#### Pre-mapping helper
A helper function, basicSubNodeDocument(), is provided to make simple pre-mapping easy. It can be used by importing the helper script:

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
You can test each pre-mapping function using qConsole using a script like the one below. Adjust this script to have the content variable containing a sequence of objects that you would want converted into a FHIR resource. In this example, we are getting the list of providerLocations from a single test document, and viewing the pre-mapping of each one.

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
For the DHF mapping GUI to work best, there should be a pre-mapped sample document in the database. This allows you to see the (pre-mapped) input to the mapping, and allows you to use the “Test” functionality to iteratively refine your mapping.

You can write your pre-mapped documents to the database using qConsole with a script like the one below. Adjust this script to have the content variable containing a sequence of objects that you would want converted into a FHIR resource. In this example (from the sample project), we are getting the list of providerLocations from a single test document, and writing the pre-mapped version of each one back into the database. This will allow the Mapping UI in DataHub Central to see the pre-mapped source document and properly map it into the FHIR Resource Entities.

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

This script depends on the 2 optional functions (getURI() and getCollections()) being present in the pre-mapper module. getCollections() must match the input collection for the DHF Step being configured for the GUI to pull up the sample document.

### How to Map Your Documents to FHIR
Once you have an Entity Services model for the FHIR domain you want to serve as output (from the provided models or a new model you have created) the main purpose of this project is to allow you to easily map it from your persistent formats to that model. 

Build a pre-mapper function if needed (see above). If you are using a pre-mapper, run the ```writePreMapToDB()``` function in QConsole to stage some suitable input for the mapping GUI. 

Launch Data Hub central and create a new mapping step in this tool. Unlike in a typical Data Hub, you will never run this step in a data flow; it will only be called as a data transform by your data services.

Begin adding mappings using xpath, functions and custom functions (if needed) as usual with a data hub mapping step. Use the "test" button to verify your mappings are working well for your test records.

### Writing Data Services
Data services are the interface between the client (e.g. HAPI which is provided as a reference implementation of a FHIR server) and the Database. For detailed information on defining a Data Service, visit [https://docs.marklogic.com/guide/java/DataServices]

In general, our data services are broken down into 6 sections:
- Build a query based on the input parameters
- Execute the query
- Filter the results (if needed)
- Apply paging based on input parameters
- Transform results into FHIR using your defined DHF mappings
- Return final results

Depending on the nature of your data and how closely your documents align to FHIR resources, you may use cts.query, Optic or another technique to implement the query in the data services Examples of each query approach are provided to help undertsand the approaches and choose the best one for your data model and team skill set.

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

Using this format to specify a search will allow you to use some utility functions in the FHIR Mapper project that convert this search paylod to a query. We provide examples for both cts.query and Optic approaches. The ctsQueryUtils.sjs and opticQueryUtils.sjs libraries help interpret and execute these search requests.

#### Output Types
It is recomended that any Data Service function that only returns a single resource (FHIR read and vread specifically) be configured to return a document, while a function that can return a list of resources (search) be configured to return an array. This will make parsing the results in the client/HAPI server easier. For detailed information on input parameters and their types, visit [https://docs.marklogic.com/guide/java/DataServices#id_pgfId-1081252]

#### Generating Data Service Proxies
To generate the Java Proxy classes that interact with the Data Service APIs, you must create and run a Gradle Task which is documented (here)[https://docs.marklogic.com/guide/java/DataServices#id_44346]. An example from this project is listed below:

```
task generatePractitioner(type: com.marklogic.client.tools.gradle.EndpointProxiesGenTask) {
	serviceDeclarationFile = 'src/main/ml-modules/root/data-services/practitioner/service.json'
}
```

The name and package of the Proxy Class are determined by the ```$javaClass``` field of the service.json file, while the function name, parameters, and return types are defined in each ```.api``` file.

### Integrating with HAPI server
The FHIR Mapper project can serve FHIR requests to any client, but HAPI (a popular open-source FHIR server) is provided with the project, and four IResourceProvider subclasses are included to make four resource types work.

The HAPI project has defined its own system of how to define what operations are available in your server and what parameters are allowed/required. Read about that (here)[https://hapifhir.io/hapi-fhir/docs/server_plain/resource_providers.html#resource-providers].

To write a new HAPI Resource Provider (IResourceProvider) with the Data Services you created in the steps above, you will follow these steps:
- Write a search() method with parameters specified using annotations, per the HAPI documentation. Convert these parameters supplied by the HAPI framework into a search request JSON string that will be acceptable to your data service. (in the examples we build a JSON string that represents the search)
- Call the relevant Data Service function using your generated data service Proxy Classes
- Parse the results into HAPIs Resource POJOs. Read about that (here)[https://hapifhir.io/hapi-fhir/docs/model/parsers.html]
- If any result modifiers are present and supported (include or revinclude for example), search for the relevant Resources
- Return a Resource Bundle containing all results

This project includes four examples of Resource Provider Java classes you can review or copy and extend to do this.