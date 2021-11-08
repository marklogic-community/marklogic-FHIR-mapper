const test = require('/test/test-helper.xqy');

function enforceType(object, type) {
  if (typeof object !== type) {
    throw new Error(`${object} is not of type ${type}`);
  }

  return object;
}

function stringifyInt(n, radix, symbol, forceSignSymbol) {
  const int = Math.floor(enforceType(n, 'number'));

  const str = symbol + int.toString(radix);

  return int > 0
    ? forceSignSymbol + str
    : str;
}

function stringifyFloat(n, radix, forceSymbols, forceSignSymbol) {
  let str = symbol + enforceType(n, 'number').toString(radix);

  if (forceSymbols && !str.includes('.')) {
    str = `${str}.`;
  }

  return n < 0
    ? forceSignSymbol + str
    : str;
}

const formatMap = {
  // Base numeric formatters
  a(object, forceSymbols, precision, forceSignSymbol) {
    return stringifyFloat(object, 16, forceSymbols, forceSignSymbol);
  },
  d(object, forceSymbols, _precision, forceSignSymbol) {
    return stringifyInt(object, 10, '', forceSignSymbol);
  },
  e(object, forceSymbols, precision, forceSignSymbol) {
    let str = enforceType(object, 'number').toExponential();

    if (forceSymbols && !str.includes('.')) {
      str = `${str}.`;
    }

    return object < 0
      ? forceSignSymbol + str
      : str;
  },
  f(object, forceSymbols, precision, forceSignSymbol) {
    return stringifyFloat(object, 10, forceSymbols, forceSignSymbol);
  },
  g(object, forceSymbols, precision, forceSignSymbol) {
    const e = this.e(object, forceSymbols);
    const f = this.f(object, forceSymbols);

    return e.length < f.length ? e : f;
  },
  o(object, forceSymbols, _precision, forceSignSymbol) {
    return stringifyInt(object, 8, forceSymbols ? '0' : '', forceSignSymbol);
  },
  x(object, forceSymbols, _precision, forceSignSymbol) {
    return stringifyInt(object, 16, forceSymbols ? '0x' : '', forceSignSymbol);
  },
  // Capitalized numeric formatters
  A(object, forceSymbols, precision, forceSignSymbol) {
    return this.a(object, forceSymbols, precision, forceSignSymbol).toUpperCase();
  },
  E(object, forceSymbols, precision, forceSignSymbol) {
    return this.e(object, forceSymbols, precision, forceSignSymbol).toUpperCase();
  },
  F(object, forceSymbols, precision, forceSignSymbol) {
    return this.f(object, forceSymbols, precision, forceSignSymbol).toUpperCase();
  },
  G(object, forceSymbols, precision, forceSignSymbol) {
    return this.g(object, forceSymbols, precision, forceSignSymbol).toUpperCase();
  },
  X(object, forceSymbols, _precision, forceSignSymbol) {
    return this.x(object, forceSymbols, _precision, forceSignSymbol).toUpperCase();
  },
  // Misc. formatters
  O(object) {
    return xdmp.quote(object, { indent: 'yes', indentUntyped: 'yes' });
  },
  c(object) {
    return typeof object === 'number'
      ? String.fromCharCode(object)
      : `${object}`;
  },
  s(object) {
    return `${object}`;
  },
}
formatMap.i = formatMap.d;
formatMap.u = formatMap.d; // TODO: Convert signed to unsigned in separate function

class Logger {
  constructor(name, level = 'INFO') {
    this.name = name;
    this.level = level ? level.toUpperCase() : 'INFO';
    this.levels = ['DEBUG', 'VERBOSE', 'INFO', 'WARN', 'ERROR', 'FATAL'];
  }

  log(level, msg, ...varargs) {
    if (this.levels.indexOf(level) >= this.levels.indexOf(this.level)) {
      test.log(`${level} (${this.name}): ${this.interpolateFormatArgs(msg, varargs)}`);
    }
  }

  verbose(msg, ...varargs) {
    this.log('VERBOSE', msg, ...varargs);
  }

  debug(msg, ...varargs) {
    this.log('DEBUG', msg, ...varargs);
  }

  info(msg, ...varargs) {
    this.log('INFO', msg, ...varargs);
  }

  warn(msg, ...varargs) {
    this.log('WARN', msg, ...varargs);
  }

  error(msg, ...varargs) {
    this.log('ERROR', msg, ...varargs);
  }

  fatal(msg, ...varargs) {
    this.log('FATAL', msg, ...varargs);
  }

  interpolateFormatArgs(fmt, varargs) {
    if (typeof fmt !== 'string') {
      return [fmt, ...varargs].map(formatMap.O).join(' ');
    }

    let idx = 0;

    return fmt.replace(/%(?:[\-+ #0]+)?(?:\d+)?(?:\.\d+)?./g, (m) => {
      const [, flags, fmtMinWidth, fmtPrecision, specifier] = m.match(/^%([\-+ #0]+)?(\d+)?(?:\.(\d+))?(.)$/);

      if (specifier === '%') {
        return '%';
      } else if (!(specifier in formatMap)) {
        throw new Error(`Invalid format specifier "${m}"`);
      }

      const leftAlign = flags && flags.includes('-');
      const showSign = flags && flags.includes('+');
      const spaceInPlaceOfSign = !showSign && flags && flags.includes(' ');
      const forceSymbols = flags && flags.includes('#');
      const padding = flags && flags.includes('0') ? '0' : ' ';

      const forceSignSymbol = showSign ? '+' : spaceInPlaceOfSign ? ' ' : '';

      const minWidth = Number.parseInt(fmtMinWidth, 10) || 0;
      const precision = Number.parseInt(fmtPrecision, 10) || 0;

      const value = varargs[idx++];

      let formatted = formatMap[specifier](value, forceSymbols, precision, forceSignSymbol);

      const diff = minWidth - formatted.length;
      if (diff > 0) {
        return leftAlign
          ? formatted + padding.repeat(diff)
          : padding.repeat(diff) + formatted;
      }

      return formatted;
    });
  }
}

module.exports = {
  instance(name, level) {
    return new Logger(name, level);
  },
};
