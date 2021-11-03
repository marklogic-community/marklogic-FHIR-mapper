const test = require('/test/test-helper.xqy');

class Logger {
  constructor(name, level = 'INFO') {
    this.name = name;
    this.level = level ? level.toUpperCase() : 'INFO';
    this.levels = ['DEBUG', 'VERBOSE', 'INFO', 'WARN', 'ERROR', 'FATAL'];
  }

  log(level, msg) {
    if (this.levels.indexOf(level) >= this.levels.indexOf(this.level)) {
      test.log(`${level} (${this.name}): ${msg}`);
    }
  }

  verbose(msg) {
    this.log('VERBOSE', msg);
  }

  debug(msg) {
    this.log('DEBUG', msg);
  }

  info(msg) {
    this.log('INFO', msg);
  }

  warn(msg) {
    this.log('WARN', msg);
  }

  error(msg) {
    this.log('ERROR', msg);
  }

  fatal(msg) {
    this.log('FATAL', msg);
  }
}

module.exports = {
  instance(name, level) {
    return new Logger(name, level);
  },
};
