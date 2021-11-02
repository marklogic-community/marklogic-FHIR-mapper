'use strict';
const egress = require("/fhir-accelerator/egress-mapping.sjs")
const op = require('/MarkLogic/optic');
const qu = require('../utils/opticQueryUtils.sjs')

// search for locations. null or empty means no filters
var search;

// starting position for paginated search results. null means start at 0
var start;

// number of results per paginated search results. null means return all results
var limit;

const searchList = search ? JSON.parse(search) : [];

const locationCol = op.col('location');
const idCol = op.col('id');
const versionCol = op.col('version');

const cityCol = op.col('city');
const stateCol = op.col('state');
const zipCol = op.col('postalcode');
const line1Col = op.col('line1');
const line2Col = op.col('line2');
const line3Col = op.col('line3');

const lastUpdatedCol = op.col('lastupdated');

var conditionList = []

// cycle through each search parameter
for(var criteria of searchList) {
  switch(criteria.field) {
    case "id":
    case "_id":
      var valueCriteria = []
      
      for(var value of criteria.values) {
        valueCriteria.push(op.sql.like(idCol, value))
      }
      
      qu.addFilterToConditionList(conditionList, valueCriteria, conditionList)
      
      break;
    case "version":
    case "_version":
      var valueCriteria = []
      
      for(var value of criteria.values) {
        valueCriteria.push(op.sql.like(versionCol, value))
      }
      
      qu.addFilterToConditionList(conditionList, valueCriteria, conditionList)
      
      break;
    case "address-city":
      qu.convertStringParameterToQuery([cityCol], criteria, conditionList)
      break;
    case "address-state":
      qu.convertStringParameterToQuery([stateCol], criteria, conditionList)
      break;
    case "address-postalcode":
      qu.convertStringParameterToQuery([zipCol], criteria, conditionList)
      break;
    case "address":
    case "name":
      qu.convertStringParameterToQuery([cityCol, stateCol, zipCol, line1Col, line2Col, line3Col], criteria, conditionList)
      break;
    case "_lastUpdated":
      qu.convertDateParameterToDateTimeQuery([lastUpdatedCol], criteria, conditionList)
  }
}

const locationdocid = op.fragmentIdCol('locationdocid');

var queryPlan = op.fromView('FHIR', 'Location', null, locationdocid)

if(conditionList.length > 1) {
  queryPlan = queryPlan.where(op.and(...conditionList))
} else if (conditionList.length === 1) {
  queryPlan = queryPlan.where(conditionList[0])
}

if(start > 0) {
  queryPlan = queryPlan.offset(start-1)
}

if(limit > 0) {
  queryPlan = queryPlan.limit(limit)
}

queryPlan = queryPlan.joinDoc(op.col('doc'), locationdocid)

queryPlan = queryPlan.select(['id', 'index', 'doc'], "")

let queryResults = queryPlan.result()

let rawResults = []

for(var current of queryResults) {
   rawResults.push(current.doc.xpath('/envelope/instance/provider/providerLocations').toArray()[current.index-1])
}

let result = egress.transformMultiple(rawResults, "ProviderToFHIRLocation");

result
