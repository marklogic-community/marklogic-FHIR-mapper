package com.marklogic.util;

import ca.uhn.fhir.rest.param.*;

import java.util.List;
import java.util.Map;
import static java.util.Map.entry;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility;

import java.util.ArrayList;

import static java.util.stream.Collectors.toList;

@JsonAutoDetect(fieldVisibility = Visibility.ANY)
public class SearchCriteria {
    String field;
    String modifier;
    List<String> values;

    private SearchCriteria(String field, String modifier, List<String> values) {
        this.field = field;
        this.values = values;

        if (modifier != null) {
            // ":exact" becomes "exact"
            this.modifier = modifier.replace(":", "");
        }
    }

    public static SearchCriteria searchCriteria(String field, String value) {
        return new SearchCriteria(field, null, List.of(value));
    }

    public static SearchCriteria searchCriteria(String field, List<String> value) {
        return new SearchCriteria(field, null, value);
    }

    public static SearchCriteria searchCriteria(String field, StringOrListParam stringOrList) {
        List<StringParam> valueTokens = stringOrList.getValuesAsQueryTokens();
        List<String> values = valueTokens.stream().map(t -> t.getValue()).collect(toList());

        StringParam firstParam = valueTokens.get(0);
        String modifier = firstParam.getQueryParameterQualifier();

        return new SearchCriteria(field, modifier, values);
    }

    public static SearchCriteria searchCriteria(String field, DateParam dateRange) {
        String modifier = dateModifierMap.get(dateRange.getPrefix().toString());

        return new SearchCriteria(field, modifier, List.of(dateRange.getValueAsString()));
    }

    public static List<SearchCriteria> searchCriteria(String field, DateRangeParam dateRange) {
        List<SearchCriteria> results = new ArrayList<SearchCriteria>();
        if (dateRange != null) {
            DateParam lowerBound = dateRange.getLowerBound();
            DateParam upperBound = dateRange.getUpperBound();

            if (lowerBound != null) {
                results.add(searchCriteria(field, lowerBound));
            }
            if (upperBound != null && upperBound.equals(lowerBound) != true) {
                results.add(searchCriteria(field, upperBound));
            }
        }
        return results;
    }

    public static SearchCriteria searchCriteria(String field, DateOrListParam dateOrList) {
        List<DateParam> valueTokens = dateOrList.getValuesAsQueryTokens();
        List<String> values = valueTokens.stream().map(t -> t.getValueAsString()).collect(toList());

        DateParam firstParam = valueTokens.get(0);
        String modifier = firstParam.getPrefix().toString();

        return new SearchCriteria(field, modifier, values);
    }

    public static List<SearchCriteria> searchCriteria(String field, StringAndListParam valueList) {
        List<SearchCriteria> values = new ArrayList<SearchCriteria>();
        if (valueList != null) {
            values = valueList.getValuesAsQueryTokens().stream()
                .map(t -> searchCriteria(field, t))
                .collect(toList());
        }
        return values;
    }

    public static List<SearchCriteria> searchCriteria(String field, DateAndListParam valueList) {
        List<SearchCriteria> values = new ArrayList<SearchCriteria>();
        if (valueList != null) {
            values = valueList.getValuesAsQueryTokens().stream()
                .map(t -> searchCriteria(field, t))
                .collect(toList());
        }
        return values;
    }

    public static SearchCriteria searchCriteria(String field, TokenOrListParam tokenOrList) {
        List<TokenParam> valueTokens = tokenOrList.getValuesAsQueryTokens();
        String modifier = valueTokens.get(0).getQueryParameterQualifier();
        List<String> values = valueTokens.stream()
            .map(t -> coerceTokenToString(t))
            .collect(toList());

        return new SearchCriteria(field, modifier, values);
    }

    private static String coerceTokenToString(TokenParam token) {
        String result = "";
        if (token.getSystem() != null) {
            result += token.getSystem() + "|";
        }
        result += token.getValue();
        return result;
    }

    public static List<SearchCriteria> searchCriteria(String field, TokenAndListParam valueList) {
        List<SearchCriteria> values = new ArrayList<SearchCriteria>();
        if (valueList != null) {
            values = valueList.getValuesAsQueryTokens().stream()
                .map(t -> searchCriteria(field, t))
                .collect(toList());
        }
        return values;
    }

    // https://www.hl7.org/fhir/search.html#prefix
    private static Map<String, String> dateModifierMap = Map.ofEntries(
        // Date & Numeric
        entry(ParamPrefixEnum.EQUAL.toString(), "eq"),
        entry(ParamPrefixEnum.GREATERTHAN_OR_EQUALS.toString(), "ge"),
        entry(ParamPrefixEnum.GREATERTHAN.toString(), "gt"),
        entry(ParamPrefixEnum.LESSTHAN_OR_EQUALS.toString(), "le"),
        entry(ParamPrefixEnum.LESSTHAN.toString(), "lt"),
        entry(ParamPrefixEnum.NOT_EQUAL.toString(), "ne"),
        entry(ParamPrefixEnum.APPROXIMATE.toString(), "ap"),
        // Period
        entry(ParamPrefixEnum.STARTS_AFTER.toString(), "sa"),
        entry(ParamPrefixEnum.ENDS_BEFORE.toString(), "eb")
    );
}
