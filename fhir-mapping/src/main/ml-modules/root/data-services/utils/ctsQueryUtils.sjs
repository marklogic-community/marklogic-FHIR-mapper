const egress = require('../../fhir-accelerator/egress-mapping.sjs')

module.exports = {
  defaultTextSearchModifiers: ['case-insensitive', 'wildcarded', 'whitespace-insensitive', 'punctuation-insensitive'],

  getValueAndSystemFromString(str) {
    const idx = str.lastIndexOf('|');
    const system = idx === -1 ? '' : str.slice(0, idx);
    const value = str.slice(idx + 1);

    return [value, system];
  },

  searchToQuery(fieldToQueryMap) {
    return ({ field, modifier, values }) => {
      if (field in fieldToQueryMap) {
        return fieldToQueryMap[field](values, modifier);
      }

      const searchValues = egress.searchValuesWithModifier(values, modifier);

      return cts.jsonPropertyValueQuery(field, searchValues, qu.defaultTextSearchModifiers);
    };
  },
};
