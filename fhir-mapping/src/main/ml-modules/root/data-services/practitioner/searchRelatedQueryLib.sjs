'use strict';
// Collection of search related queries
// TODO - Revisit these queries to optimize as we discover more things
function getSearchByFamilyQuery(family) {
	const query = cts.andQuery([
	cts.collectionQuery('provider-scdhhs-canonical'),
	cts.jsonPropertyValueQuery("lastName","*" + family + "*",
		["case-insensitive","wildcarded","whitespace-insensitive","punctuation-insensitive"]),
	cts.jsonPropertyValueQuery("providerType","PERSON")
	//cts.orQuery([cts.jsonPropertyValueQuery("providerType","PERSON"),
	//            cts.jsonPropertyValueQuery("providerType","ORGANIZATION")])
	]);
	return query;
};

function getSearchByIDQuery(id) {
	const query = cts.andQuery([
	cts.collectionQuery('provider-scdhhs-canonical'),
	cts.jsonPropertyValueQuery("publicID",id),
	cts.jsonPropertyValueQuery("providerType","PERSON")
	//cts.orQuery([cts.jsonPropertyValueQuery("providerType","PERSON"),
	//            cts.jsonPropertyValueQuery("providerType","ORGANIZATION")])
	]);
	return query;
};

function getSearchByGivenQuery(family) {
	const query = cts.andQuery([
	cts.collectionQuery('provider-scdhhs-canonical'),
	cts.jsonPropertyValueQuery("firstName","*" + given + "*",
		["case-insensitive","wildcarded","whitespace-insensitive","punctuation-insensitive"]),
	cts.jsonPropertyValueQuery("providerType","PERSON")
	//cts.orQuery([cts.jsonPropertyValueQuery("providerType","PERSON"),
	//            cts.jsonPropertyValueQuery("providerType","ORGANIZATION")])
	]);
	return query;
};

function getSearchByNameQuery(name) {
	const query = cts.andQuery([
	cts.collectionQuery('provider-scdhhs-canonical'),
	cts.orQuery([
		cts.jsonPropertyValueQuery("firstName","*" + name + "*",
			["case-insensitive","wildcarded","whitespace-insensitive","punctuation-insensitive"]),
		cts.jsonPropertyValueQuery("lastName","*" + name + "*",
			["case-insensitive","wildcarded","whitespace-insensitive","punctuation-insensitive"]),
		cts.jsonPropertyValueQuery("middleName","*" + name + "*",
			["case-insensitive","wildcarded","whitespace-insensitive","punctuation-insensitive"])
	]),
	cts.jsonPropertyValueQuery("providerType","PERSON")
	//cts.orQuery([cts.jsonPropertyValueQuery("providerType","PERSON"),
	//            cts.jsonPropertyValueQuery("providerType","ORGANIZATION")])
	]);
	return query;
};
// Expected date format 2021-04-21
// Need to check whether we need exact match date? ("=", "<=", ">=")
function getSearchByLastUpdated(date) {
	const query = cts.andQuery([
	cts.collectionQuery('provider-scdhhs-canonical'),
	cts.jsonPropertyRangeQuery("ingestTimestamp", ">=", xs.dateTime(date+"T00:00:00")),
	cts.jsonPropertyValueQuery("providerType","PERSON")
	]);
	return query;
};

module.exports = {
  getSearchByFamilyQuery,
  getSearchByIDQuery,
  getSearchByGivenQuery,
  getSearchByNameQuery,
  getSearchByLastUpdated
};
