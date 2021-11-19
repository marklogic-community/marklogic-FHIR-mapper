const egress = require('../../fhir-accelerator/egress-mapping.sjs')

module.exports = {
  defaultTextSearchModifiers: ['case-insensitive', 'wildcarded', 'whitespace-insensitive', 'punctuation-insensitive'],

  getValueAndSystemFromString(str) {
    const idx = str.lastIndexOf('|');
    const system = idx === -1 ? '' : str.slice(0, idx);
    const value = str.slice(idx + 1);

    return [value, system];
  },

  textSearch(columns, values, modifier, searchModifiers = this.defaultTextSearchModifiers) {
    return cts.jsonPropertyValueQuery(columns, egress.searchValuesWithModifier(values, modifier), searchModifiers);
  },

  searchToQuery(fieldToQueryMap) {
    return ({ field, modifier, values }) => {
      // If there is a matching field handler in the fieldToQueryMap, invoke that and return the result.
      if (field in fieldToQueryMap) {
        return fieldToQueryMap[field](values, modifier);
      }

      // Default handler for fields which do not have an entry in the fieldToQueryMap. Treats all unknown fields as text.
      return this.textSearch(field, values, modifier);
    };
  },
};
