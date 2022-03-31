# MarkLogic FHIR Mapper Cookbook

See the README for basic information about the nature of this project, and how to set it up. This document descries how to extend the project and get it working wity your own data set.

## Assumptions
This guide makes some assumptions about developers and projects. These assumptions include:

You have a MarkLogic database project and it:
- Either already uses DHF 5.7.0 or newer, or can continue to operate when DHF 5.7.0+ is installed
- Has records that have already been harmonized, mastered, and stored in a MarkLogic database

Developers:
- Have a basic understanding of the FHIR specification

## What this guide will cover
- How to transform  persistent data stored in a MarkLogic database into FHIR compliant JSON using a DataHub Mapping Step
- How to create Data Services to support read operations needed for FHIR
- How to connect a HAPI server instance to the data Services

## What this guide won't cover
- How to harmonize or master your data
- How to implement a full fledged FHIR server
  - Only the connection between a HAPI server and a MarkLogic database will be covered
- Details of the FHIR specification
- Details of the HAPI server implementation

## Adding the FHIR Mapper to your project
You can run this project as is with provided test data, but for actual production use you should merge the libraries from this project, and possibly the provided FHIR data models, with the code in your own project.

- Add DHF 5.7.0+ to your MarkLogic project if it does not already exist
- Copy files from the fhir-mapping project into your MarkLogic project
  - `fhir-mapping/src/main/ml-modules/root/fhir-accelerator` and `fhir-mapping/src/main/ml-modules/root/lib` contain code which will assist in the conversion from your stored data models to the FHIR Resource JSON.
  - `fhir-mapping/entities` contains a few Data Hub entities that represent the FHIR Resource models. You will also need to create entities for any other FHIR Resources you are planning to serve out of your MarkLogic cluster.

### Modeling Resource Entities
The FHIR-mapper works by mapping data from your persistent document formats to an Entity Services (ES) model representing a FHIR resource. Four (at this writing) ES models are provided (Location, Patient, Pratcitioner and PractitionerRole). You may need to add more models.

Entity services models produce JSON with a wrapper property around all sub-structures, which makes querying easer. To produce true FHIR formatted JSON we have provided a [post-step interceptor](./fhir-mapping/src/main/ml-modules/root/lib/interceptors/unwrap-es-fhir.sjs) which removes these extra levels of nesting.

Review the FHIR specifications, and create a new Entity Services model using the DHF modeling tool. Alternatively, some customers automate some or all of the conversion from the FHIR JSON schema that is provided to the Entity Services format (contact MarkLogic for recommendations or code to convert JSON Schema to Entity Services). Manual adjustments to an auto-converted ES model may be needed.


### Mapping your data to FHIR Resource Entities
Because your data will be different from the sample data in the project, you must map your data (documents) to FHIR-based Entity Services models. You can do this by mapping your persistent documents (after applying a pre-mapping if any) using the Data Hub Central UI and following the [DHF instructions](https://docs.marklogic.com/datahub/5.5/flows/create-mapping-step-using-hubcentral.html) for the resource Entity you are working on.

### Premapping your data
Pre-mapping is the process of pre-processing a record or records in the database before running the DHF mapping that will convert the data to the FHIR format. The FHIR Accelerator libraries will apply the pre-mapper (if it exists) to a document before passing the result on to a DHF mapping for actual transformation to FHIR.

When is pre-mapping needed?

- The mapping only applies to a substructure of an overall document in your database. For example, if you have a Provider document that has an array of Locations where they provide services, when you are mapping to a single FHIR Location resource you must pre-map the overall Provider document to only the specific Location item you are interested in. (This exact situation is in the provided sample data and mappings)
- If you need data from more than 1 document to map to a single resource. In this case, you can pre-map the data to get the extra documents you need and combine into one JSON record that will then be mapped by a DHF mapping you build. For example, if you store addresses in a separate document from a Provider, you will need to retrieve that document when converting the Provider into a Practitioner.

Pre mapping in these cases is needed because the DHF mappings are 1:1, so require a single input document to map, and restrict mappings to the “instance” property if the data in in Entity Services envelope format. If you have many documents, many sub-objects within a document, or data outside the instance, you must pre-map.

#### How to pre-map your documents
We recommend using [pre-step interceptors](https://docs.marklogic.com/datahub/5.7/flows/about-interceptors-custom-hooks.html) to perform pre-mapping on your documents.

The FHIR Mapper project includes a generic ["expand-instance" pre-step interceptor](./fhir-mapping/src/main/ml-modules/root/lib/interceptors/expand-instance.sjs) which is capable of handling the first case above automatically, with proper configuration. The next section details how to use this interceptor, and working examples can be found in the [Provider Location](./fhir-mapping/steps/mapping/ProviderToFHIRLocation.step.json) and [Provider Role](./fhir-mapping/steps/mapping/ProviderToUSCorePractitionerRole.step.json) mappings.

If you need data from multiple documents, you can reference [this MarkLogic Healthcare Starter Kit pre-step interceptor](https://github.com/marklogic-community/marklogic-healthcare-starter-kit/blob/feature/upgrade-data-hub-to-5.7/src/main/ml-modules/root/lib/interceptors/insert-claim-lines.sjs), but you will need to create your own pre-step interceptor, as we have not created a generic interceptor for that use case yet.

One more pre-step interceptor included in this project is [`flat-to-multiple.sjs`](./fhir-mapping/src/main/ml-modules/root/lib/interceptors/flat-to-multiple.sjs), which functions as a single, one-time running of any and all `flatToMultipleEntries` calls you may have in existing mappings. More details on this interceptor are available in a dedicated section below.

##### Using the `expand-instance.sjs` Interceptor

The `expand-instance` interceptor is intended to take a subnode of a document and insert that subnode into `/envelope/instance` *alongside* the original instance, as well as its index (in the case where the subnode is one of many). It takes additional variable values in order to customize how it is run:

Name               | Optional | Type                    | Default     | Description
------------------:|:--------:|:-----------------------:|:-----------:|:-----------
`entireRecord`     | Yes      | `boolean`               | `false`     | Return the entire document record in the interceptor output vs. only the instance. Use `true` if using `"sourceRecordScope": "entireRecord"` in step definition.
`destination`      | Yes      | `string`                | `"subnode"` | The name of the node which will be inserted into `/envelope/instance` with the subnode provided to the mapping
`siblingNames`     | Yes      | `string` or `string[]`  | N/A         | The name(s) of ancestor nodes for the current subnode which you would like to get the XQuery index of. These will be inserted into `/envelope/instance` under a node named `<destination>Indices` and the name of the sibling used to get the index, e.g.: `"siblingNames": ["test1", "test2"]` would result in `"subnodeIndices": { "test1": 1, "test2": 5, ... }` appearing in the instance.

This interceptor is "idempotent" - it will always produce the same output structure for a given subnode or document. It contains logic to prevent transforming a document multiple times in the form of one additional output node, `/envelope/instance/__expand-instance__`, which if present and `true`, causes the interceptor to skip an input document/node on subsequent runs.

##### Using the `flat-to-multiple.sjs` interceptor

The `flat-to-multiple` interceptor is intended to replace the need to call `flatToMultipleEntries` on individual mappings in DHF, because

1. The usage of `flatToMultipleEntries` is complicated by how individual field sources are represented in the finished mapping
1. The same field may need to be run through `flatToMultipleEntries` multiple times in a single mapping
1. You need to access the `parent` field from the output of `flatToMultipleEntries` to access anything from the original document other than the individual source fields referenced

`flat-to-multiple.sjs` also takes additional variable values in order to customize how it is run:

Name                      | Optional | Type                    | Default     | Description
-------------------------:|:--------:|:-----------------------:|:-----------:|:-----------
`entireRecord`            | Yes      | `boolean`               | `false`     | Return the entire document record in the interceptor output vs. only the instance. Use `true` if using `"sourceRecordScope": "entireRecord"` in step definition.
`entries`                 | No       | `object[]`              | N/A         | An array of breakouts to process (more below)
entries.`dest`            | No       | `string`                | N/A         | The name of a new node to insert into `/envelope/instance` for each applicable breakout from this entry
entries.`sourcedFrom`     | Yes      | `string`                | N/A         | As in any mapping step `sourcedFrom` field, an XPath exression to the base node(s) to use in the breakout
entries.`breakouts`       | No       | `object[]`              | N/A         | The individual breakouts to process for this entry
entries.breakouts.`type`  | No       | `string`                | N/A         | As in the original `flatToMultipleEntries`, the `type` added to the output node for a given entry
entries.breakouts.`xpath` | No       | `string`                | N/A         | As in the original `flatToMultipleEntries`, an XPath to the node to use for the `source` output

This interceptor is idempotent because it will overwrite the additional nodes from previous runs.

> Note that if using both `expand-instance` and `flat-to-multiple`, the `flat-to-multiple` pre-step interceptor entry *must* come after `expand-instance`, as otherwise `flat-to-multiple` will fail because there will not be a `/envelope/instance` in the source node.

#### Testing your pre-step interceptor configuration
You can test your configured pre-step interceptors for a given mapping in qConsole using a script like the one below. Adjust this script to have `nodes` containing the documents or subnodes that you want to convert into a FHIR resource. In this example, we are getting the list of `providerLocations` from a single test document, and viewing the results of running the mapping step's pre-step interceptors on each one.

```js
'use strict';

declareUpdate();

const egress = require('/fhir-accelerator/egress-mapping.sjs');

const nodes = cts.doc('/provider/provider1.json').xpath('//providerLocations');

Sequence.from(egress.runPreStepInterceptorsOnNodes(nodes, 'ProviderToFHIRLocation'));
```

#### Making the pre-mapped documents available to the Data Hub Mapping UI
For the DHF mapping GUI to work best, you will need to insert pre-mapped sample document(s) into the database. This allows you to see the (pre-mapped) input to the mapping, and allows you to use the “Test” functionality to iteratively refine your mapping.

You can write your pre-mapped documents to the database using qConsole with a script like the one below. Adjust this script to have `nodes` containing the documents or subnodes that you want to convert into a FHIR resource. In this example (from the sample project), we are getting the list of `providerLocations` from a single test document, and writing the pre-mapped version of each one back into the database. This will allow the Mapping UI in Data Hub to see the pre-mapped source document and properly map it into the FHIR Resource Entities.

```js
'use strict';

declareUpdate();

const egress = require('/fhir-accelerator/egress-mapping.sjs')

const nodes = cts.doc('/provider/provider1.json').xpath('//providerLocations');

const result = egress.runPreStepInterceptorsOnNodes(nodes, 'ProviderToFHIRLocation');

for (const value of result) {
  const id = fn.head(result[0].xpath('/envelope/headers/metadata/publicID'));
  const idx = fn.head(value.xpath('/envelope/instance/locationIndices/providerLocations'));

  xdmp.documentInsert(
    `/location/location-${id}-${idx}.json`,
    value,
    {
      collections: ['pretransformed-ProviderLocation'],
      permissions: [xdmp.permission('rest-reader', 'read'), xdmp.permission('rest-writer', 'update')]
    },
  );
}

Sequence.from(result);
```

This script depends on the mapping using the [`expand-instance.sjs`](./fhir-mapping/src/main/ml-modules/root/lib/interceptors/expand-instance.sjs) pre-step interceptor.

### How to Map Your Documents to FHIR
Once you have an Entity Services model for the FHIR domain you want to serve as output (from the provided models or a new model you have created) the main purpose of this project is to allow you to easily map it from your persistent formats to that model.

Use the included [pre-step interceptors](./fhir-mapping/src/main/ml-modules/root/lib/interceptors/) or build your own if needed (using the existing interceptors as examples). If you are using a pre-step interceptor, run the qConsole example script from the previous section to stage some suitable input for the mapping GUI.

Launch Data Hub central and create a new mapping step in this tool. Unlike in a typical Data Hub, you will never run this step in a data flow; it will only be called as a data transform by your data services.

Begin adding mappings using xpath, functions, and custom functions (if needed) as usual with a data hub mapping step. Use the "test" button to verify your mappings are working well for your test records.

### Writing Data Services
Data services are the interface between the client (e.g. HAPI which is provided as a reference implementation of a FHIR server) and the Database. More detailed instructions on defining Data Services is [available online](https://docs.marklogic.com/guide/java/DataServices).

In general, our data services are broken down into 6 sections:
- Build a query based on the input parameters
- Execute the query
- Filter the results (if needed)
- Apply paging based on input parameters
- Transform results into FHIR using your defined DHF mappings
- Return final results

Depending on the nature of your data and how closely your documents align to FHIR resources, you may use cts.query, Optic or another technique to implement the query in the data services Examples of each query approach are provided to help undertsand the approaches and choose the best one for your data model and team skill set.

#### Input Parameters
In our example project, we used a generic `search` parameter that is a stringified JSON object that represents the search to be performed. This JSON object is in the form:

```json
[
  {
    "field": "searchfield1",
    "modifier": "optionalmodifier",
    "values": ["value1", "value2"]
  },
  {
    "field": "searchfield2",
    "modifier": "optionalmodifier",
    "values": ["value3", "value4"]
  }
]
```

In adition to the search parameter we included the paging parameters as optional integers.

This is not the only way to pass the search parameters from the client (HAPI) to the Data Service, but it does allow the construction of the query (CTS, Optic, SPARQL, etc.) to be built as a loop over the array of search criteria. More detailed information on input parameters and their types is [available online](https://docs.marklogic.com/guide/java/DataServices#id_pgfId-1081233).

Using this format to specify a search will allow you to use some utility functions in the FHIR Mapper project that convert this search paylod to a query. We provide examples for both cts.query and Optic approaches. The ctsQueryUtils.sjs and opticQueryUtils.sjs libraries help interpret and execute these search requests.

#### Output Types
It is recomended that any Data Service function that only returns a single resource (FHIR read and vread specifically) be configured to return a document, while a function that can return a list of resources (search) be configured to return an array. This will make parsing the results in the client/HAPI server easier. More detailed information on input parameters and their types is [available online](https://docs.marklogic.com/guide/java/DataServices#id_pgfId-1081252).

#### Generating Data Service Proxies
To generate the Java Proxy classes that interact with the Data Service APIs, you must [create and run a Gradle Task](https://docs.marklogic.com/guide/java/DataServices#id_44346). An example from this project is listed below:

```gradle
task generatePractitioner(type: com.marklogic.client.tools.gradle.EndpointProxiesGenTask) {
	serviceDeclarationFile = 'src/main/ml-modules/root/data-services/practitioner/service.json'
}
```

The name and package of the Proxy Class are determined by the `$javaClass` field of the service.json file, while the function name, parameters, and return types are defined in each `.api` file.

### Integrating with HAPI server
The FHIR Mapper project can serve FHIR requests to any client, but HAPI (a popular open-source FHIR server) is provided with the project, and four IResourceProvider subclasses are included to make four resource types work.

The HAPI project has defined [its own system of how to define what operations are available](https://hapifhir.io/hapi-fhir/docs/server_plain/resource_providers.html#resource-providers).

To write a new HAPI Resource Provider (IResourceProvider) with the Data Services you created in the steps above, you will follow these steps:
- Write a search() method with parameters specified using annotations, per the HAPI documentation. Convert these parameters supplied by the HAPI framework into a search request JSON string that will be acceptable to your data service. (in the examples we build a JSON string that represents the search)
- Call the relevant Data Service function using your generated data service Proxy Classes
- [Parse the results into HAPIs Resource POJOs](https://hapifhir.io/hapi-fhir/docs/model/parsers.html)
- If any result modifiers are present and supported (include or revinclude for example), search for the relevant Resources
- Return a Resource Bundle containing all results

This project includes four examples of Resource Provider Java classes you can review or copy and extend to do this.
