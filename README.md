# Babel Contracts

This is a [Babel](https://babeljs.io/) plugin for design by contract for JavaScript.

[![Build Status](https://travis-ci.org/codemix/babel-plugin-contracts.svg)](https://travis-ci.org/codemix/babel-plugin-contracts)

# What?

[Design by contract](https://en.wikipedia.org/wiki/Design_by_contract) is a very powerful technique for writing robust software, it can be thought of as a formal but convenient method for specifying assertions. Instead of the developer documenting their assumptions in comments, or worse, not documenting them at all, Design by Contract gives them a way to express their assumptions in a convenient syntax, and have those assumptions validated at runtime.

Contracts come in three flavours:

- **[preconditions](http://en.wikipedia.org/wiki/Precondition)** which run at the start of a function.
- **[postconditions](http://en.wikipedia.org/wiki/Postcondition)** which run at the end of a function.
- **[invariants](http://en.wikipedia.org/wiki/Invariant_\(computer_science\))** which run at both the start and end of a *block*.

Each statement in a contract must evaluate to true for the contract to be valid. If a contract fails, an error will be thrown.

Preconditions are usually used to validate the arguments to a function, or the state of the system before the main function body executes.

Postconditions are used to validate the result or side effects of the function.

Invariants are used to ensure that an assumption holds true for the duration of the function.

Although not strictly a contract, **[assertions](https://en.wikipedia.org/wiki/Assertion_\(software_development\))** are also supported.

Neither invariants, assertions, preconditions or postconditions themselves may have side-effects, e.g. it is not possible to assign a new value to a variable from within a contract.

> Purity within contracts is enforced as much as possible by the plugin, but it is still possible for a programmer to circumvent, by calling an impure function from within the precondition or postcondition. **This is strongly discouraged.**

This plugin implements Design by Contract by ~~abusing~~ repurposing JavaScript labels. Labels are a very rarely used feature of JavaScript, and a nice thing about them is that if a label is specified but not used, it is simply ignored by the JavaScript engine.
This allows us to break up our function body into labeled sections, without affecting the result or behavior of the function. The plugin then retrieves these special labeled sections and transpiles them into contracts.

# Installation

Install via [npm](https://npmjs.org/package/babel-plugin-contracts).
```sh
npm install --save-dev babel-plugin-contracts
```
Then, in your babel configuration (usually in your `.babelrc` file), add `"contracts"` to your list of plugins:
```json
{
  "plugins": [
    ["contracts", {
      "env": {
        "production": {
          "strip": true
        }
      }
    }]
  ]
}
```

The above example configuration will remove all contracts when `NODE_ENV=production`, which is often preferable for performance reasons.

## Examples

1. **Precondition Only.**

  The contract for the following function specifies that the first argument must always be a string.

  ```js
  function warn (message) {
    pre: typeof message === 'string';
    return 'Warning!\n' + message;
  }
  ```

  If we call this function with a non string argument, an error will be thrown.

2. **Postcondition Only.**

  The following function specifies that the result of the function must always be an array containing more than one element.

  > Note: Post-conditions introduce a special variable, `it` which refers to the result of the function.

  ```js
  function items (a, b) {
    let c = [];
    if (a) {
      c.push(a);
    }
    if (b) {
      c.push(b);
    }
    return c;

    post: {
      Array.isArray(it);
      it.length > 0;
    }
  }
  ```
    If we call this function without arguments, the post-condition will fail and an error will be thrown.

  > Note: preconditions and postconditions can appear in any order directly within the function body.

  Postconditions can also refer to the state of the world at the entry point of the function, which is extremely useful when verifying the results of functions with side effects. For this, we use a pseudo-function called `old()` which takes a single argument - the reference we want to capture, for example:

  ```js
  function applyDiscount (cart, amount) {
    pre: {
      !cart.hasDiscount, "Discounts can only be applied once";
      cart.total >= amount, "Cannot discount to less than zero.";
    }
    post: {
      cart.total === old(cart.total) - amount;
    }
    cart.total -= amount;
    cart.hasDiscount = true;
    // some more complicated stuff goes here...
    return cart;
  }
  ```


3. **Preconditions and Postconditions.**

  ```js
  function withdraw (fromAccount, amount) {
    pre: {
      typeof amount === 'number';
      amount > 0;
      fromAccount.balance - amount > -fromAccount.overdraftLimit;
    }
    post: {
      fromAccount.balance - amount > -fromAccount.overdraftLimit;
    }

    fromAccount.balance -= amount;
  }
  ```

4. **Invariants**

  Invariants run at the beginning and end of a block. Using invariants we can simplify the above example.


  ```js
  function withdraw (fromAccount, amount) {
    pre: {
      typeof amount === 'number';
      amount > 0;
    }
    invariant: {
      fromAccount.balance - amount > -fromAccount.overdraftLimit;
    }

    fromAccount.balance -= amount;
  }
  ```

4. **Assertions**

  Assertions verify that something is truthy and throw an error if the assertion fails. They run where they are specified:

  ```js
  function add (a, b) {
    const result = a + b;
    assert: typeof result === 'number';
    return result;
  }
  ```

  or, with multiple:

  ```js
  function addAndSquare (a, b) {
    let result = a + b;
    assert: {
      typeof result === 'number';
      !isNaN(result);
    }

    result *= result;

    assert: result < Math.pow(2, 32), "Must be within an acceptable range";

    return result;
  }
  ```

5. **Error Messages**

  Often it's nice to provide an error message for the contract that failed, for example:

  ```js
  function withdraw (fromAccount, amount) {
    pre: {
      typeof amount === 'number', "Second argument must be a number";
      amount > 0, "Cannot withdraw a zero or negative amount";
      fromAccount.balance - amount > -fromAccount.overdraftLimit, "Must not exceed overdraft limit";
    }
    post: {
      fromAccount.balance - amount > -fromAccount.overdraftLimit, "Must not exceed overdraft limit";
    }

    fromAccount.balance -= amount;
  }
  ```

  Now if a contract fails, the error object will have a descriptive message.

# Migrating from Contractual.
This plugin uses a very similar syntax to our earlier Design by Contract library, [contractual](https://github.com/codemix/contractual). 
If you're migrating your project there are some differences to be aware of:

1. There is no longer a `main:` section. Anything outside of a contract is considered to be part of the normal program code.
2. Contracts containing more than one assertion **must** be fully wrapped in a block statement (`{` and `}`), labels no longer act as delimiters.
3. `__result` is now called `it` in postconditions.
4. Invariants can be specified at the block / scope level, not just at function entry points.
5. No longer creates custom error types.


# License

Published by [codemix](http://codemix.com/) under a permissive MIT License, see [LICENSE.md](./LICENSE.md).

