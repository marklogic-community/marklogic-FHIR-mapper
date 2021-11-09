const test = require('/test/test-helper.xqy');

const logger = require('./testLogger.sjs').instance('testUtils.sjs');

const basePath = test.__CALLER_FILE__.split('/').slice(0, -1).concat('test-data').join('/');

function checkRequiredPropertiesExistInOptions(fnName, obj, ...props) {
  const keys = Object.keys(obj);
  const missing = props.filter(prop => !keys.includes(prop));

  if (missing.length > 0) {
    const msg = `${fnName}: Missing required properties in provided options: ${missing.map(k => `"${k}"`).join(', ')}`;

    logger.fatal(msg);

    throw new Error(msg);
  }
}

module.exports = {
  logger,

  getAbsolutePath(path) {
    return [basePath, path].join('/').replace(/\/\//g, '/');
  },
  findDocumentsAlongPath(path, recursive = false, database) {
    return xdmp.invokeFunction(() => xdmp.directory(path, recursive ? 'infinity' : '1'), { database });
  },

  insertOriginalDocumentCollections(documents, database) {
    xdmp.invokeFunction(
      () => { documents.forEach(d => { d.collections = xdmp.documentGetCollections(d.baseURI); }); },
      { database },
    );
  },

  insertOriginalDocumentPermissions(documents, database) {
    xdmp.invokeFunction(
      () => { documents.forEach(d => { d.permissions = xdmp.documentGetPermissions(d.baseURI); }); },
      { database },
    );
  },

  attempt(cb) {
    try {
      return cb();
    } catch (e) {
      this.logger.error('%s:\n%s', e.message, e.stack);
    }
  },
  flatten(arr) {
    // NOTE: Flatten the array using Array.prototype.reduce (Array.prototype.flat is not supported yet)
    return arr.reduce((acc, res) => acc.concat(res), []);
  },
  flatMap(arr, cb) {
    return this.flatten(arr.map(cb));
  },

  loadTestDocuments(opts) {
    checkRequiredPropertiesExistInOptions('loadTestDocuments', opts, 'path');

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

  unloadTestDocuments(opts) {
    checkRequiredPropertiesExistInOptions('unloadTestDocuments', opts, 'path');

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
