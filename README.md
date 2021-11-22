# FHIR Mapper Project

This project is a demonstration on how to serve FHIR directly out of your MarkLogic database to satisfy an interoperability requirement without standing up a dedicated database. This is achieved by linking a HAPI server to Data Services that live on the MarkLogic server that perform the requested searches and transform the persistent data into a FHIR record using a DHF Mapping Step.

The HAPI server we have implemented here only shows how to set up MarkLogic as the backend storage solution for a read only HAPI server. We have not included how to set up the rest of a fully compliant FHIR server with things like OAuth authentication or pathent authorization to share data with a provider.

## When to use this project
The FHIR Mapper can be used to evaluate the capabilities of serving FHIR directly out of your Operational Data Store, as well as a blueprint to follow when implementing the same. When you are implemeting the FHIR server capabilities for your own data, remember that the FHIR Mapper assumes that you already have data in a clean and canonical form, and is not meant to data clense or master the data.

For instructions on how to use integrate the FHIR Mapper into your existing ODS project, see the Cook Book.

## Trying the Demo Project

### Deploy to MarkLogic

To deploy the application to a fresh ML server, run ```./gradlew mlDeploy``` from the ```fhir-mapping``` folder.

### Load Example Data
To load the sample set of data that comes with the project (in ```src/main/ml-data```), run ```./gradlew mlLoadData``` from the ```fhir-mapping``` folder.

### Run HAPI Server
To run the HAPI server that connects to and queries data from the project you just deployed, run ```./gradlew bootRun``` from the ```hapi-server``` folder.

### Viewing the data in the HAPI Overlay
Navigate to http://localhost:8081

#### Note about PractitionerRoles
The PractitionerRole date type was included in the project to show the handling of ```_include``` and ```_revinclude``` query parameters. The data is not fully mapped into the FHIR resource.

#### Example queries
- From the [Pracitioner query page](http://localhost:8081/resource?serverId=home&pretty=false&_summary=&resource=Practitioner), search for ```family``` name ```Doe```. You should get 2 Practitioner results back (John and Jane Doe).
- From the [Patient query page](http://localhost:8081/resource?serverId=home&pretty=false&_summary=&resource=Patient), search for ```given``` name ```Jake```. You should get 1 Patient result back (Jake Jacobs).

#### Known Issues in the HAPI Overlay
- ```OperationDefinition``` is displayed as a resource type that can be interacted with even though the server does not support it
- The ```Practitioner``` search page gives an option to ```Include``` the relationship ```PractitionerRole:practitioner```. This will cause an error if slected because the server (and the spec) is expecting ```PractitionerRole:practitioner``` to be a ```ReverseInclude```. If you modify the search that is performed to have ```_revinclude```, instead of ```_include``` the server will respond as expected.

These issues are most likely caused by the fact that we copied the overlay into our project by hand instead of using the maven overly capabilities because this is a gradle project. A possible workaround is to stand up a HAPI Overlay server in it's own project and configure it to communicate with the FHIR server that is run in the hapi-server project.

## Running the Example Unit Tests
There are 3 types of tests in the Demo Project:

- JS unit tests to test the server side code
- Java tests to test and demostrate the use of the Data Service Proxy Classes
- Java tests to test the HAPI resource providers

Below are instructions to view and run each of these tests.

### JS Unit Tests
The Server Side Java Script tests are located in ```fhir-mapping/src/test/ml-modules/root/test``` and are run using the marklogic-unit-test libraries.

Note: Running these tests will clear the database and load test specific data. If you want to use the HAPI server to view FHIR records or run the other tests, you will need to load the example data again.

#### Running From Commandline
To execute these tests, run ```./gradelw mlUnitTest``` in the ```fhir-mapping``` directory. This will run the tests and display some basic PASS/FAIL information. To see more details about a given test, run them from the test UI.

#### Running From Test UI
To execute the tests from a UI, visit [http://localhost:8011/test/default.xqy] and select the test you want to run from the list.

### Data Service Proxy Tests
The tests of the Data Service Proxies are located in ```fhir-mapping/src/test/java```.

#### Running the Tests
To execute these tests, run ```./gradelw test``` in the ```fhir-mapping``` directory. This will run the tests using JUnit. To View more details about the test results see the report that JUnit generates by opening ```fhir-mapping/build/reports/tests/test/index.html``` in a browser.

### HAPI Resource Provider Tests
The tests of the Data Service Proxies are located in ```hapi-server/src/test/java```.

#### Running the Tests
To execute these tests, run ```./gradelw test``` in the ```hapi-server``` directory. This will run the tests using JUnit. To View more details about the test results see the report that JUnit generates by opening ```hapi-server/build/reports/tests/test/index.html``` in a browser.