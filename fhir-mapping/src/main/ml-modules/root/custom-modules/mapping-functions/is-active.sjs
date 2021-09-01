'use strict';

function isActive(effectiveDateString, expirationDateString) {

  if((effectiveDateString instanceof NullNode || effectiveDateString == "") && (expirationDateString instanceof NullNode || expirationDateString == "")) {
    return true
  }else if ((effectiveDateString instanceof NullNode || xs.date(effectiveDateString) <= fn.currentDate()) && (expirationDateString instanceof NullNode || xs.date(expirationDateString) >= fn.currentDate())) {
    return true
  }

  return false
}

module.exports = {
 isActive
}
