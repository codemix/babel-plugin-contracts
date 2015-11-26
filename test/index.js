import fs from 'fs';
import {parse, transform, traverse} from 'babel-core';

if (process.env.NODE_WATCH) {
  var contracts = require('../src').default;
}
else if (process.env.CONTRACTS_USE_LIBCHECKED) {
  var contracts = require('../lib-checked').default;
}
else {
  var contracts = require('../lib').default;
}

describe('Typecheck', function () {
  ok('precondition', 'foo');
  failWith(`Function "demo" precondition failed: typeof input === 'string'`, 'precondition', false);
  ok('precondition-with-message', 'foo');
  failWith(`Input must be a string`, 'precondition-with-message', false);
  ok('precondition-multiple', 'abcd');
  failWith(`Function "demo" precondition failed: input.length > 3`, 'precondition-multiple', 'abc');
  failWith(`Function "demo" precondition failed: input.length < 6`, 'precondition-multiple', 'abcdefgh');
  failWith(`Function "demo" precondition failed: typeof input === 'string'`, 'precondition-multiple', false);
  failStatic('bad-precondition-with-let', ['foo', 'bar']);
  failStatic('bad-precondition-with-updateexpr', ['foo', 'bar']);
  failStatic('bad-precondition-with-assignment', ['foo', 'bar']);

  ok('postcondition', 'foo');
  failWith(`Function "demo" postcondition failed: typeof it === 'string'`, 'postcondition', false);
  ok('postcondition-with-if', 'foo');
  failWith(`Function "demo" postcondition failed: typeof it === 'string'`, 'postcondition-with-if', false);
  ok('postcondition-with-if-inside', 'foo');
  failWith(`Function "demo" postcondition failed: it.length > 2`, 'postcondition-with-if-inside', 'no');
  ok('postcondition-no-return', 'foo');
  failWith(`Function "demo" postcondition failed: typeof input === 'string'`, 'postcondition-no-return', false);
  ok('postcondition-conditional', true);
  failWith(`Function "demo" postcondition failed: it === true`, 'postcondition-conditional', false);

  ok('precondition-and-postcondition', 'foo');
  failWith(`Function "demo" precondition failed: typeof input === 'string'`, 'precondition-and-postcondition', true);
  failWith(`Function "demo" postcondition failed: it > 2`, 'precondition-and-postcondition', 'no');

  it(`should load itself`, function () {
    this.timeout(10000);
    load('/../../src/index');
  });
});

function load (basename) {
  return loadInternal(basename).exports.default;
}

function loadInternal (basename) {
  const filename = `${__dirname}/fixtures/${basename}.js`;
  const source = fs.readFileSync(filename, 'utf8');
  const transformed = transform(source, {
    filename: filename,
    presets: [
      "es2015",
      "stage-0",
    ],
    plugins: [
      contracts,
      'transform-flow-strip-types',
      'syntax-class-properties'
    ]
  });
  const context = {
    exports: {}
  };
  if (process.env.CONTRACTS_SAVE_TRANSFORMED) {
    fs.writeFileSync(`${__dirname}/fixtures/${basename}.js.transformed`, transformed.code, 'utf8');
  }
  const loaded = new Function('module', 'exports', 'require', transformed.code);
  loaded(context, context.exports, (path) => {
    if (/^\.\//.test(path)) {
      const module = loadInternal(path.slice(2));
      return module.exports;
    }
    else {
      return require(path);
    }
  });
  return context;
}

function isThenable (thing: mixed): boolean {
  return thing && typeof thing.then === 'function';
}


function ok (basename, ...args) {
  it(`should load '${basename}'`, async function () {
    const result = load(basename)(...args);
    if (isThenable(result)) {
      await result;
    }
  });
}

function fail (basename, ...args) {
  it(`should not load '${basename}'`, async function () {
    let failed = false;
    try {
      const result = load(basename)(...args);
      if (isThenable(result)) {
        await result;
      }
    }
    catch (e) {
      failed = true;
    }
    if (!failed) {
      throw new Error(`Test '${basename}' should have failed but did not.`);
    }
  });
}

function failWith (errorMessage, basename, ...args) {
  it(`should not load '${basename}'`, async function () {
    let failed = false;
    let message;
    try {
      const result = load(basename)(...args);
      if (isThenable(result)) {
        await result;
      }
    }
    catch (e) {
      failed = true;
      message = e.message;
    }
    if (!failed) {
      throw new Error(`Test '${basename}' should have failed but did not.`);
    }
    // ignore differences in whitespace in comparison.
    if (message.replace(/\s+/g, ' ') !== errorMessage.replace(/\s+/g, ' ')) {
      throw new Error(`Test '${basename}' failed with ${message} instead of ${errorMessage}.`);
    }
  });
}


function failStatic (basename, ...args) {
  it(`should refuse to load '${basename}'`, function () {
    let failed = false;
    try {
      load(basename)(...args);
    }
    catch (e) {
      if (e instanceof SyntaxError) {
        failed = true;
        //console.log(e.toString());
      }
      else {
        throw e;
      }
    }
    if (!failed) {
      throw new Error(`Test '${basename}' should have failed static verification but did not.`);
    }
  });
}