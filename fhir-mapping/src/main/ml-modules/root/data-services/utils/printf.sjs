// Helper methods for formatMap below
// Ensure the given data is of the correct type for a format specifier
function enforceType(object, type) {
  if (typeof object !== type) {
    throw new Error(`${object} is not of type ${type}`);
  }

  return object;
}

function applySignIfNecessary(n, str, signSymbol) {
  return n >= 0 ? (signSymbol + str) : `-${str}`;
}

// Convert the given number to an integer string using the given radix and other parameters
function stringifyInt(n, radix, symbol, forceSignSymbol, precision) {
  const int = Math.floor(enforceType(n, 'number'));

  let str = symbol + Math.abs(int).toString(radix);

  const diff = precision - str.length
  if (diff > 0) {
    str = '0'.repeat(diff) + str;
  }

  return applySignIfNecessary(n, str, forceSignSymbol);
}

// Convert the given number to a string using the given radix and other parameters
function stringifyFloat(n, radix, forceSymbols, forceSignSymbol, precision) {
  const t = enforceType(Math.abs(n), 'number').toFixed(precision === -1 ? 15 : precision);
  let str = Number.parseFloat(t).toString(radix);

  if (forceSymbols && !str.includes('.')) {
    str = `${str}.`;
  }

  const idx = str.indexOf('.') + 1;
  const diff = precision - (str.length - idx);
  if (diff > 0) {
    str = str + '0'.repeat(diff);
  } else if (precision > -1) {
    str = str.slice(0, idx + precision);
  }

  return applySignIfNecessary(n, str, forceSignSymbol);
}

// Buffers to convert from signed to unsigned integers.
// FUTURE: Support numbers larger than 32-bit?
const signedToUnsignedBuffer = new Int32Array(1);
const signedToUnsignedView = new Uint32Array(signedToUnsignedBuffer.buffer);

const formatMap = {
  // Base numeric formatters
  /** Hexadecimal floating-point representation */
  a(object, forceSymbols, precision, forceSignSymbol) {
    return stringifyFloat(object, 16, forceSymbols, forceSignSymbol, precision);
  },
  /** Decimal integer representation */
  d(object, forceSymbols, precision, forceSignSymbol) {
    return stringifyInt(object, 10, '', forceSignSymbol, precision);
  },
  /** Exponential floating-point representation */
  e(object, forceSymbols, precision, forceSignSymbol) {
    const t = enforceType(object, 'number').toPrecision(precision === -1 ? 15 : precision);
    let str = Number.parseFloat(t).toExponential();

    if (forceSymbols && !str.includes('.')) {
      str = `${str}.`;
    }

    return applySignIfNecessary(object, str, forceSignSymbol);
  },
  /** Decimal floating-point representation */
  f(object, forceSymbols, precision, forceSignSymbol) {
    return stringifyFloat(object, 10, forceSymbols, forceSignSymbol, precision);
  },
  /** Decimal or exponential floating-point representation, whichever is shorter */
  g(object, forceSymbols, precision, forceSignSymbol) {
    const e = this.e(object, forceSymbols, precision, forceSignSymbol);
    const f = this.f(object, forceSymbols, precision, forceSignSymbol);

    return e.length < f.length ? e : f;
  },
  /** Octal integer representation */
  o(object, forceSymbols, precision, forceSignSymbol) {
    return stringifyInt(object, 8, forceSymbols ? '0' : '', forceSignSymbol, precision);
  },
  /** Unsigned decimal integer representation */
  u(object, forceSymbols, precision, forceSignSymbol) {
    signedToUnsignedBuffer[0] = enforceType(object, 'number');

    return this.d(signedToUnsignedView[0], forceSymbols, precision, forceSignSymbol);
  },
  /** Hexadecimal integer representation */
  x(object, forceSymbols, precision, forceSignSymbol) {
    return stringifyInt(object, 16, forceSymbols ? '0x' : '', forceSignSymbol, precision);
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
  X(object, forceSymbols, precision, forceSignSymbol) {
    return this.x(object, forceSymbols, precision, forceSignSymbol).toUpperCase();
  },
  // Misc. formatters
  /** JSON-stringified object */
  O(object) {
    if (object instanceof Error) {
      return `${object.message}\n${object.stack}`;
    }

    return xdmp.quote(object, { indent: 'yes', indentUntyped: 'yes' });
  },
  /** C-style character */
  c(object) {
    return String.fromCharCode(enforceType(object, 'number'));
  },
  /** String */
  s(object, _forceSymbols, precision) {
    const r = enforceType(object, 'string')

    return precision !== -1
      ? r.slice(0, Math.min(r.length, precision))
      : r;
  },
}
formatMap.i = formatMap.d; // Alias for d

/**
 * printf implementation based roughly on [stdio.h printf]{@link https://www.cplusplus.com/reference/cstdio/printf/}
 * with some influence taken from the standard JS `console` functions
 *
 * @param  {any}      fmt      The format string, or an object to be JSON-formatted. If this is not a format string then
 *                             all arguments will be added to the resulting string as JSON-stringified objects
 * @param  {...any[]} varargs  The format arguments. If the first argument is a format string, any functions provided
 *                             here will be invoked and their result will be appended to the resulting string.
 *
 * @return {string}
 */
function printf(fmt, ...varargs) {
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
    const paddingChar = flags && flags.includes('0') ? '0' : ' ';

    const forceSignSymbol = showSign ? '+' : spaceInPlaceOfSign ? ' ' : '';

    const minWidth = Number.parseInt(fmtMinWidth, 10) || 0;
    const precision = Number.parseInt(fmtPrecision, 10) || -1;

    let value = varargs[idx++];

    if (typeof value === 'function') {
      value = value();
    }

    let formatted = formatMap[specifier](value, forceSymbols, precision, forceSignSymbol);

    const diff = minWidth - formatted.length;
    if (diff > 0) {
      const padding = paddingChar.repeat(diff);

      return leftAlign
        ? formatted + padding
        : padding + formatted;
    }

    return formatted;
  });
}

module.exports = printf;
