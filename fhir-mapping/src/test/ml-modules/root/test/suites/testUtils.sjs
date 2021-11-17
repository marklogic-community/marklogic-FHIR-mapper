const test = require('/test/test-helper.xqy');

const printf = require('/data-services/utils/printf.sjs');

/**
 * Base path for finding test-data directory from a given test suite
 *
 * @type   {string}
 */
const basePath = test.__CALLER_FILE__.split('/').slice(0, -1).concat('test-data').join('/');

/**
 * @typedef {Object} DocumentWrapper
 *
 * @property {string}   baseURI     The base URI of the source document
 * @property {string[]} collections The collections to apply to the document when inserting into the destination database
 * @property {Document} doc         The source document
 * @property {string[]} permissions The permissions to apply to the document when inserting into the destination database
 */

/**
 * @typedef {Object} UnloadOpts
 *
 * @property {string}  path          The path within the test-data folder to look
 *
 * @property {string}  baseUri       (Optional) The base URI to prepend paths with when removing from/inserting into the destination database. Defaults to the path.
 * @property {number}  destinationDb (Optional) The destination database ID. Defaults to the current execution database.
 * @property {boolean} recursive     (Optional) Whether to search along the path recursively for documents. Defaults to false.
 * @property {number}  sourceDb      (Optional) The source database ID to use. Defaults to the modules database for the current execution.
 */

/**
 * @typedef {Object & UnloadOpts} LoadOpts
 *
 * @property {string[]} collections (Optional) A list of collections to use instead of inheriting from the source database.
 * @property {string[]} permissions (Optional) A list of permissions to use instead of inheriting from the source database.
 */

/**
 * @typedef SearchDefinition
 *
 * @property {string}    field    The field to search on
 * @property {string}    modifier The value search modifier, or `null` if there is no modifier to be applied
 * @property {unknown[]} values   The values to search for (OR-joined)
 */

/**
 * @typedef TestDefinition
 *
 * @property {string}             description   The test's description
 * @property {SearchDefinition[]} search        The search criteria for the test (AND-joined)
 *
 * @property {number}             expectedCount (Optional) The expected number of results
 */

module.exports = {
  /**
   * Determine the absolute path a document is stored at based on the unit test file calling this function
   *
   * @param  {string} path The path within the test-data folder to find
   *
   * @return {string}
   */
  getAbsolutePath(path) {
    return [basePath, path].join('/').replace(/\/\//g, '/');
  },
  /**
   * Find all documents along a given path in the source database
   *
   * @param  {string}  path      The path within the test-data folder to search along
   * @param  {boolean} recursive Whether to search a single directory or all directories along the given path
   * @param  {number}  database  The source database ID
   *
   * @return {Document[]}
   */
  findDocumentsAlongPath(path, recursive = false, database) {
    return xdmp.invokeFunction(() => xdmp.directory(path, recursive ? 'infinity' : '1'), { database });
  },

  /**
   * Add the given documents' original collections from the source database to the objects containing them in order to be inserted into the destination database
   *
   * @param  {DocumentWrapper[]} documents The documents to get collections for
   * @param  {number}            database  The source database ID
   *
   * @return {void}
   */
  insertOriginalDocumentCollections(documents, database) {
    xdmp.invokeFunction(
      () => { documents.forEach(d => { d.collections = xdmp.documentGetCollections(d.baseURI); }); },
      { database },
    );
  },

  /**
   * Add the given documents' original permissions from the source database to the objects containing them in order to be inserted into the destination database
   *
   * @param  {DocumentWrapper[]} documents The documents to get permissions for
   * @param  {number}            database  The source database ID
   *
   * @return {void}
   */
  insertOriginalDocumentPermissions(documents, database) {
    xdmp.invokeFunction(
      () => { documents.forEach(d => { d.permissions = xdmp.documentGetPermissions(d.baseURI); }); },
      { database },
    );
  },

  /**
   * Wrapper to attempt a callback and log any errors that occurred. DOES NOT RE-THROW ERRORS
   *
   * @param  {(...any[]) => T} cb   A function callback to be called
   * @param  {...any[]}        args Arguments to pass to the callback at runtime
   *
   * @return {T}
   */
  attempt(cb, ...args) {
    try {
      return cb(...args);
    } catch (e) {
      test.log(printf(e));
    }
  },
  /**
   * Flatten an array by one level, e.g.; [[1], [2, [3]], 4] -> [1, 2, [3], 4]
   *
   * @param  {any[]} arr The array to flatten
   *
   * @return {any[]}
   */
  flatten(arr) {
    // NOTE: Flatten the array using Array.prototype.reduce (Array.prototype.flat is not supported yet)
    return arr.reduce((acc, res) => acc.concat(res), []);
  },
  /**
   * Flatten an array after having mapped its values using the given callback function
   *
   * @param  {any[]}        arr The array to map/flatten
   * @param  {(any) => any} cb  The mapping function callback
   *
   * @return {any[]}
   */
  flatMap(arr, cb) {
    return this.flatten(arr.map(cb));
  },
  /**
   * Require the given object to have values for the given property keys
   *
   * @param  {Object}      obj    The object to check
   * @param  {...string[]} props  The properties to require
   *
   * @return {void}
   *
   * @throws If the object is missing any of the required properties, or a property is present but undefined
   */
  requireProperties(obj, ...props) {
    const keys = Object.keys(obj);
    const missing = props.filter(prop => !keys.includes(prop) || obj[prop] === undefined);

    if (missing.length > 0) {
      throw new Error(`Missing required properties in provided object: ${missing.map(k => `"${k}"`).join(', ')}`);
    }
  },

  /**
   * Load test documents along the given path from the given source database into the given destination database. Optional: load recursively along path, override collections, permissions on inserted documents.
   *
   * @param  {LoadOpts} opts The options
   *
   * @return {void}
   */
  loadTestDocuments(opts) {
    try {
      this.requireProperties(opts, 'path');
    } catch (e) {
      test.log(printf('Unable to load test documents: %O', e));

      throw e;
    }

    const options = { baseUri: opts.path, destinationDb: xdmp.database(), sourceDb: xdmp.modulesDatabase(), ...opts };
    const { baseUri, collections, destinationDb, path, permissions, recursive, sourceDb } = options;

    const fullPath = this.getAbsolutePath(path);
    test.log(
      printf(
        'Inserting all documents in directory "%s" from database "%s" into database "%s"',
        fullPath,
        xdmp.databaseName(sourceDb),
        xdmp.databaseName(destinationDb),
      ),
    );

    const documents = this.findDocumentsAlongPath(fullPath, recursive, sourceDb).toArray().map(doc => ({
      baseURI: doc.baseURI,
      collections,
      doc,
      permissions,
    }));
    test.log(printf('Retrieved %d documents in source database to insert', documents.length));

    if (!collections) {
      this.insertOriginalDocumentCollections(documents, sourceDb);
    }

    if (!permissions) {
      this.insertOriginalDocumentPermissions(documents, sourceDb);
    }

    xdmp.invokeFunction(
      () => {
        try {
          test.log('Inserting documents to destination database');
          for (const d of documents) {
            xdmp.documentInsert(d.baseURI.replace(fullPath, baseUri), d.doc, d.permissions, d.collections);
          }
          test.log('Finished inserting documents to destination database');
        } catch (e) {
          test.log(printf(e));
        }
      },
      { database: destinationDb, transactionMode: 'update-auto-commit' },
    );
  },

  /**
   * Unload test documents along the given path in the given source database from the given destination database. Optional: load recursively along path.
   *
   * @param  {UnloadOpts}  opts  The options
   *
   * @return {void}
   */
  unloadTestDocuments(opts) {
    try {
      this.requireProperties(opts, 'path');
    } catch (e) {
      test.log(printf('Unable to unload test documents: %O', e));

      throw e;
    }

    const options = { baseUri: opts.path, destinationDb: xdmp.database(), sourceDb: xdmp.modulesDatabase(), ...opts };
    const { baseUri, path, destinationDb, recursive, sourceDb } = options;

    const fullPath = this.getAbsolutePath(path);
    test.log(
      printf(
        'Removing all documents from database "%s" which have a matching document in directory "%s" in database "%s"',
        xdmp.databaseName(destinationDb),
        fullPath,
        xdmp.databaseName(sourceDb),
      ),
    );

    const documents = this.findDocumentsAlongPath(fullPath, recursive, sourceDb);
    test.log(printf('Found %d documents in source database to remove', fn.count(documents)));

    xdmp.invokeFunction(
      () => {
        try {
          declareUpdate();
          test.log('Removing documents from destination database');
          for (const d of documents) {
            xdmp.documentDelete(d.baseURI.replace(fullPath, baseUri), { ifNotExists: 'allow' });
          }
          test.log('Finished removing documents from destination database');
        } catch (e) {
          test.log(printf(e));
        }
      },
      { database: destinationDb, transactionMode: 'update-auto-commit' },
    );
  },

  /**
   * Run tests defined by an array of TestDefinition objects against a given module, returning an array of the individual assertions run by each test
   *
   * @param  {string}           module  The path to the module which is being tested
   * @param  {TestDefinition[]} tests   An array of test definitions to run
   *
   * @return {unknown[]}
   */
  runTestsAgainstModule(module, tests) {
    return this.flatMap(tests, opts => {
      try {
        this.requireProperties(opts, 'description', 'search');
      } catch (e) {
        throw new Error(`Unable to run test for "${opts.description || '<Missing Description>'}": ${e.message}`);
      }

      const { description, search, start, limit, expectedCount } = { expectedCount: null, ...opts };

      try {
        for (const parameter of search) {
          this.requireProperties(parameter, 'field', 'modifier', 'values');
        }
      } catch (e) {
        throw new Error(`Unable to run test for "${description}": a search parameter is missing one or more required fields: ${e.message}`);
      }

      const results = fn.head(xdmp.invoke(module, {
        search: xdmp.quote(search.map(parameter => ({ field: parameter.field, modifier: parameter.modifier, values: parameter.values }))),
        start,
        limit,
      }));

      const returnedAssertions = [];

      if (Number.isSafeInteger(expectedCount)) {
        returnedAssertions.push(
          test.assertEqual(expectedCount, results.length, `${description}: Expected ${expectedCount} results, got ${results.length}`),
        );
      } else {
        test.log(printf(results.length, results));
      }

      return returnedAssertions.concat(this.flatMap(results, r => search.map(parameter => parameter.test ? parameter.test(r) : fn.true())));
    });
  },
};
