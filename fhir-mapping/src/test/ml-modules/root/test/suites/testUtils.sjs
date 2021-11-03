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
  findDocumentsAlongPath(path, recursive = false, fromDatabaseID) {
    return xdmp.invokeFunction(() => xdmp.directory(path, recursive ? 'infinity' : '1'), { database: fromDatabaseID });
  },

  attempt(cb) {
    try {
      cb();
    } catch (e) {
      this.logger.error(e);
    }
  },

  loadTestDocuments(opts) {
    checkRequiredPropertiesExistInOptions('loadTestDocuments', opts, 'path');

    const { baseUri, collections, destinationDb, path, permissions, recursive, sourceDb } = {
      baseUri: opts.path,
      destinationDb: xdmp.database(),
      sourceDb: xdmp.modulesDatabase(),
      ...opts,
    };

    const fullPath = this.getAbsolutePath(path);
    this.logger.info(`Inserting all documents in directory "${fullPath}" from database "${xdmp.databaseName(sourceDb)}" into database "${xdmp.databaseName(destinationDb)}"`);

    const documents = this.findDocumentsAlongPath(fullPath, recursive, sourceDb);
    this.logger.debug(`Retrieved ${fn.count(documents)} documents in source database to insert`);

    xdmp.invokeFunction(
      () => {
        try {
          this.logger.debug('Inserting documents to destination database');
          for (const d of documents) {
            xdmp.documentInsert(d.baseURI.replace(fullPath, baseUri), d, permissions, collections);
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

    const { baseUri, path, destinationDb, recursive, sourceDb } = {
      baseUri: opts.path,
      destinationDb: xdmp.database(),
      sourceDb: xdmp.modulesDatabase(),
      ...opts,
    };

    const fullPath = this.getAbsolutePath(path);
    this.logger.info(`Removing all documents from database "${xdmp.databaseName(destinationDb)}" which have a matching document in directory "${fullPath}" in database "${xdmp.databaseName(sourceDb)}"`);

    const documents = this.findDocumentsAlongPath(fullPath, recursive, sourceDb);
    this.logger.debug(`Found ${fn.count(documents)} documents in source database to remove`);

    xdmp.invokeFunction(
      () => {
        try {
          this.logger.debug('Removing documents from destination database');
          for (const d of documents) {
            xdmp.documentInsert(d.baseURI.replace(fullPath, baseUri), { ifNotExists: 'allow' });
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
