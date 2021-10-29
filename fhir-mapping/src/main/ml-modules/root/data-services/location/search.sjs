'use strict';
const egress = require("/fhir-accelerator/egress-mapping.sjs")
const op = require('/MarkLogic/optic');

const beginningOfDay = xs.time('00:00:00')

function applyStringParamModifier(modifier, value) {
  if("exact" === criteria.modifier) {
    //do nothing to the value
  } else if("contains" === criteria.modifier) {
    value = '%' + value + '%'
  } else if("" === criteria.modifier) {
    value = value + '%'
  }
  
  return value;
}

function convertDateParameterToDateTimeQuery(columns, criteria, localConditionList) {
  var valueCriteria = []
  for(var value of criteria.values) {
    let columnCriteria = []
    let valueDateTime = fn.dateTime(xs.date(value), beginningOfDay)
    let valueNextDayDateTime = fn.dateTime(xs.date(value).add(xs.dayTimeDuration('P1D')), beginningOfDay)
    
    for (var col of columns) {
      
      switch (criteria.modifier) {
        case "=":
          columnCriteria.push(op.and(op.ge(col, valueDateTime), op.lt(col, valueNextDayDateTime)))
          break;
        case ">":
          columnCriteria.push(op.ge(col, valueNextDayDateTime))
          break;
        case ">=":
          columnCriteria.push(op.ge(col, valueDateTime))
          break;
        case "<":
          columnCriteria.push(op.lt(col, valueDateTime))
          break;
        case "<=":
          columnCriteria.push(op.lt(col, valueNextDayDateTime))
          break;
      }
    }
    addFilterToConditionList(valueCriteria, columnCriteria)
  }
  addFilterToConditionList(localConditionList, valueCriteria)
}

function convertStringParameterToQuery(columns, criteria, localConditionList) {
  var valueCriteria = []
  for(var value of criteria.values) {
    var columnCriteria = []
    //adjust the value based on the modifier
    var value = applyStringParamModifier(criteria.modifier, value)
    for (var col of columns) {
      columnCriteria.push(op.sql.like(col, value))
    }
    addFilterToConditionList(valueCriteria, columnCriteria)
  }
  addFilterToConditionList(localConditionList, valueCriteria)
}

function addFilterToConditionList(conditions, newFilter) {
  if(newFilter.length > 1) {
    conditions.push(op.or(...newFilter))
  } else {
    conditions.push(newFilter[0])
  }
}

// search for locations. null or empty means no filters
var search;

// starting position for paginated search results. null means start at 0
var start;

// number of results per paginated search results. null means return all results
var limit;

const searchList = search ? JSON.parse(search) : [];

const locationCol = op.col('location');
const idCol = op.col('id');

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
      
      addFilterToConditionList(conditionList, valueCriteria, conditionList)
      
      break;
    case "address-city":
      convertStringParameterToQuery([cityCol], criteria, conditionList)
      break;
    case "address-state":
      convertStringParameterToQuery([stateCol], criteria, conditionList)
      break;
    case "address-postalcode":
      convertStringParameterToQuery([zipCol], criteria, conditionList)
      break;
    case "address":
    case "name":
      convertStringParameterToQuery([cityCol, stateCol, zipCol, line1Col, line2Col, line3Col], criteria, conditionList)
      break;
    case "_lastUpdated":
      convertDateParameterToDateTimeQuery([lastUpdatedCol], criteria, conditionList)
  }
}

const locationdocid = op.fragmentIdCol('locationdocid');

var queryPlan = op.fromView('FHIR', 'Location', null, locationdocid)

xdmp.log("Search" + search, 'notice')
xdmp.log("Conditions" + conditionList.toString(), 'notice')

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

xdmp.log("QueryPlan: " + queryPlan.toString(), 'notice')

let queryResults = queryPlan.result()

xdmp.log("QueryResult: " + queryResults.toString(), 'notice')

let rawResults = []

for(var current of queryResults) {
   rawResults.push(current.doc.xpath('/envelope/instance/provider/providerLocations').toArray()[current.index-1])
}

let result = egress.transformMultiple(rawResults, "ProviderToFHIRLocation");

result
