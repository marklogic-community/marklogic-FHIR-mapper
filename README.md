# FHIR Mapper Project

## Deployment to MarkLogic

To deploy the application to a fresh ML server, run ```./gradlew mlDeploy``` from the ```fhir-mapping``` folder.

## Load data

To load the sample set of data that comes with the project (in ```src/main/ml-data```), run ```./gradlew mlLoadData``` from the ```fhir-mapping``` folder.


## HAPI Server

To run the HAPI server that connects to and queries data from the project you just deployed, run ```./gradlew bootRun``` from the ```hapi-server``` folder.

## Viewing the data in the HAPI Overlay

- Navigate to http://localhost:8081

### Example queries
- From the [Pracitioner query page](http://localhost:8081/resource?serverId=home&pretty=false&_summary=&resource=Practitioner), search for ```family``` name ```Doe```. You should get 2 Practitioner results back (John and Jane Doe).
- From the [Patient query page](http://localhost:8081/resource?serverId=home&pretty=false&_summary=&resource=Patient), search for ```given``` name ```Jake```. You should get 1 Patient result back (Jake Jacobs).
