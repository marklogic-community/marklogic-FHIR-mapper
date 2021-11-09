const test = require('/test/test-helper.xqy');

const logger = require('./testLogger.sjs').instance('testUtils.sjs');

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

module.exports = {
  logger,

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
      this.logger.error('%s:\n%s', e.message, e.stack);
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
   * @throws If the object is missing any of the required properties, or the property is null/undefined
   */
  requireProperties(obj, ...props) {
    const keys = Object.keys(obj);
    const missing = props.filter(prop => !keys.includes(prop) || obj[prop] === undefined || obj[prop] === null);

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
      this.logger.error('Unable to load test documents: %O', e);

      throw e;
    }

    const options = { baseUri: opts.path, destinationDb: xdmp.database(), sourceDb: xdmp.modulesDatabase(), ...opts };
    const { baseUri, collections, destinationDb, path, permissions, recursive, sourceDb } = options;

    const fullPath = this.getAbsolutePath(path);
    this.logger.info(`Inserting all documents in directory "${fullPath}" from database "${xdmp.databaseName(sourceDb)}" into database "${xdmp.databaseName(destinationDb)}"`);

    const documents = this.findDocumentsAlongPath(fullPath, recursive, sourceDb).toArray().map(doc => ({
      baseURI: doc.baseURI,
      collections,
      doc,
      permissions,
    }));
    this.logger.debug(`Retrieved ${documents.length} documents in source database to insert`);

    if (!collections) {
      this.insertOriginalDocumentCollections(documents, sourceDb);
    }

    if (!permissions) {
      this.insertOriginalDocumentPermissions(documents, sourceDb);
    }

    xdmp.invokeFunction(
      () => {
        try {
          this.logger.debug('Inserting documents to destination database');
          for (const d of documents) {
            xdmp.documentInsert(d.baseURI.replace(fullPath, baseUri), d.doc, d.permissions, d.collections);
          }
          this.logger.debug('Finished inserting documents to destination database');
        } catch (e) {
          this.logger.error(e);
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
      this.logger.error('Unable to unload test documents: %O', e);

      throw e;
    }

    const options = { baseUri: opts.path, destinationDb: xdmp.database(), sourceDb: xdmp.modulesDatabase(), ...opts };
    const { baseUri, path, destinationDb, recursive, sourceDb } = options;

    const fullPath = this.getAbsolutePath(path);
    this.logger.info(`Removing all documents from database "${xdmp.databaseName(destinationDb)}" which have a matching document in directory "${fullPath}" in database "${xdmp.databaseName(sourceDb)}"`);

    const documents = this.findDocumentsAlongPath(fullPath, recursive, sourceDb);
    this.logger.debug(`Found ${fn.count(documents)} documents in source database to remove`);

    xdmp.invokeFunction(
      () => {
        try {
          declareUpdate();
          this.logger.debug('Removing documents from destination database');
          for (const d of documents) {
            xdmp.documentDelete(d.baseURI.replace(fullPath, baseUri), { ifNotExists: 'allow' });
          }
          this.logger.debug('Finished removing documents from destination database');
        } catch (e) {
          this.logger.error(e);
        }
      },
      { database: destinationDb, transactionMode: 'update-auto-commit' },
    );
  },
};
