const beginningOfDay = xs.time('00:00:00')

function applyStringParamModifier(modifier, value) {
  if("exact" === modifier) {
    //do nothing to the value
  } else if("contains" === modifier) {
    value = '%' + value + '%'
  } else if("" === modifier) {
    value = value + '%'
  }
  
  return value;
}

function convertDateParameterToDateTimeQuery(columns, criteria, conditionList) {
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
  addFilterToConditionList(conditionList, valueCriteria)
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

module.exports = {
  addFilterToConditionList,
  convertDateParameterToDateTimeQuery,
  convertStringParameterToQuery
}
