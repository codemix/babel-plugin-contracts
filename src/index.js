import generate from "babel-generator";

type Plugin = {
  visitor: Visitors
};

type PluginParams = {
  types: Object;
  template: (source: string) => (ids: Object) => Node;
};

type Visitors = {
  [key: string]: Visitor
}

type Visitor = (path: NodePath) => void;

type Node = {
  type: string;
  node?: void;
};

type Literal = {
  type: 'StringLiteral' | 'BooleanLiteral' | 'NumericLiteral' | 'NullLiteral' | 'RegExpLiteral'
};

type Identifier = {
  type: string;
  name: string;
};

type Scope = {};

type NodePath = {
  type: string;
  node: Node;
  scope: Scope;
};


/**
 * # Design By Contract Transformer
 */
export default function ({types: t, template, options}: PluginParams, opts): Plugin {

  const PRECONDITION_NAME = 'pre';
  const POSTCONDITION_NAME = 'post';
  const INVARIANT_NAME = 'invariant';
  const ASSERT_NAME = 'assert';
  const RETURN_NAME = 'it';
  console.log(options);
  const returnId: Identifier = t.identifier(RETURN_NAME);

  const guard: (ids: {[key: string]: Node}) => Node = template(`
    if (!condition) {
      throw new Error(message);
    }
  `);

  const guardFn: (ids: {[key: string]: Node}) => Node = template(`
    function id (it) {
      conditions;
      return it;
    }
  `);

  function assemblePrecondition (path: NodePath): void {
    const body: NodePath = path.get('body');
    const fn: NodePath = path.getFunctionParent();
    const name: string = fn.node.id ? `"${fn.node.id.name}" `: ' ';
    if (body.isExpressionStatement()) {
      let condition: NodePath = body.get('expression');
      let message: ?Node;
      if (condition.isSequenceExpression()) {
        const expressions = condition.get('expressions');
        condition = expressions[0];
        message = expressions[1].node;
      }
      else {
        message = t.stringLiteral(`Function ${name}precondition failed: ${generate(condition.node).code}`);
      }
      path.replaceWith(guard({
        condition,
        message
      }));
      return;
    }

    body.traverse({
      "VariableDeclaration|Function|AssignmentExpression|UpdateExpression|YieldExpression|ReturnStatement" (item: NodePath): void {
        throw path.buildCodeFrameError(`Preconditions cannot have side effects.`);
      },
      ExpressionStatement (statement: NodePath): void {
        let condition: NodePath = statement.get('expression');
        let message: ?Node;
        if (condition.isSequenceExpression()) {
          const expressions = condition.get('expressions');
          condition = expressions[0];
          message = expressions[1].node;
        }
        else {
          message = t.stringLiteral(`Function ${name}precondition failed: ${generate(condition.node).code}`);
        }
        statement.replaceWith(guard({
          condition,
          message
        }));
      }
    });

    if (body.isBlockStatement()) {
      path.replaceWithMultiple(path.get('body').node.body);
    }
    else {
      path.replaceWith(path.get('body'));
    }
  }

  function assemblePostcondition (path: NodePath): Identifier {
    const body: NodePath = path.get('body');
    const fn: NodePath = path.getFunctionParent();
    const name: string = fn.node.id ? `"${fn.node.id.name}" `: ' ';
    const conditions: Node[] = [];

    if (body.isExpressionStatement()) {
      let condition: NodePath = body.get('expression');
      let message: ?Node;
      if (condition.isSequenceExpression()) {
        const expressions = condition.get('expressions');
        condition = expressions[0];
        message = expressions[1].node;
      }
      else {
        message = t.stringLiteral(`Function ${name}postcondition failed: ${generate(condition.node).code}`);
      }
      conditions.push(guard({
        condition,
        message
      }));
    }
    else {
      body.traverse({
        "VariableDeclaration|Function|AssignmentExpression|UpdateExpression|YieldExpression|ReturnStatement" (item: NodePath): void {
          throw path.buildCodeFrameError(`Postconditions cannot have side effects.`);
        },
        ExpressionStatement (statement: NodePath): void {
          let condition: NodePath = statement.get('expression');
          let message: ?Node;
          if (condition.isSequenceExpression()) {
            const expressions = condition.get('expressions');
            condition = expressions[0];
            message = expressions[1].node;
          }
          else {
            message = t.stringLiteral(`Function ${name}postcondition failed: ${generate(condition.node).code}`);
          }
          statement.replaceWith(guard({
            condition,
            message
          }));
        }
      });
      conditions.push(...body.node.body);
    }

    const id = path.scope.generateUidIdentifier(`${fn.node.id ? fn.node.id.name : 'check'}Postcondition`);

    path.replaceWith(guardFn({
      id,
      conditions,
      it: returnId
    }));

    return id;
  }

  function assembleAssertion (path: NodePath): void {
    const body: NodePath = path.get('body');
    const fn: ?NodePath = path.getFunctionParent();
    const name: string = fn && fn.node && fn.node.id ? `"${fn.node.id.name}"` : '';
    if (body.isExpressionStatement()) {
      let condition: NodePath = body.get('expression');
      let message: ?Node;
      if (condition.isSequenceExpression()) {
        const expressions = condition.get('expressions');
        condition = expressions[0];
        message = expressions[1].node;
      }
      else if (name) {
        message = t.stringLiteral(`Function ${name} assertion failed: ${generate(condition.node).code}`);
      }
      else {
        message = t.stringLiteral(`Assertion failed: ${generate(condition.node).code}`);
      }
      path.replaceWith(guard({
        condition,
        message
      }));
      return;
    }

    body.traverse({
      "VariableDeclaration|Function|AssignmentExpression|UpdateExpression|YieldExpression|ReturnStatement" (item: NodePath): void {
        throw path.buildCodeFrameError(`Assertions cannot have side effects.`);
      },
      ExpressionStatement (statement: NodePath): void {
        let condition: NodePath = statement.get('expression');
        let message: ?Node;
        if (condition.isSequenceExpression()) {
          const expressions = condition.get('expressions');
          condition = expressions[0];
          message = expressions[1].node;
        }
        else if (name) {
          message = t.stringLiteral(`Function ${name} assertion failed: ${generate(condition.node).code}`);
        }
        else {
          message = t.stringLiteral(`Assertion failed: ${generate(condition.node).code}`);
        }
        statement.replaceWith(guard({
          condition,
          message
        }));
      }
    });

    if (body.isBlockStatement()) {
      path.replaceWithMultiple(path.get('body').node.body);
    }
    else {
      path.replaceWith(path.get('body'));
    }
  }

  function assembleInvariant (path: NodePath): Identifier {
    const body: NodePath = path.get('body');
    const fn: NodePath = path.getFunctionParent();
    const name: string = fn.node.id ? `"${fn.node.id.name}" `: ' ';
    const conditions: Node[] = [];

    if (body.isExpressionStatement()) {
      let condition: NodePath = body.get('expression');
      let message: ?Node;
      if (condition.isSequenceExpression()) {
        const expressions = condition.get('expressions');
        condition = expressions[0];
        message = expressions[1].node;
      }
      else {
        message = t.stringLiteral(`Function ${name}invariant failed: ${generate(condition.node).code}`);
      }
      conditions.push(guard({
        condition,
        message
      }));
    }
    else {
      body.traverse({
        "VariableDeclaration|Function|AssignmentExpression|UpdateExpression|YieldExpression|ReturnStatement" (item: NodePath): void {
          throw path.buildCodeFrameError(`Invariants cannot have side effects.`);
        },
        ExpressionStatement (statement: NodePath): void {
          let condition: NodePath = statement.get('expression');
          let message: ?Node;
          if (condition.isSequenceExpression()) {
            const expressions = condition.get('expressions');
            condition = expressions[0];
            message = expressions[1].node;
          }
          else {
            message = t.stringLiteral(`Function ${name}invariant failed: ${generate(condition.node).code}`);
          }
          statement.replaceWith(guard({
            condition,
            message
          }));
        }
      });
      conditions.push(...body.node.body);
    }

    const id = path.scope.generateUidIdentifier(`${fn.node.id ? fn.node.id.name : 'check'}Invariant`);

    path.replaceWith(guardFn({
      id,
      conditions,
      it: returnId
    }));

    return id;
  }


  function expression (input: string): Function {
    const fn: Function = template(input);
    return function (...args) {
      const node: Node = fn(...args);
      return getExpression(node);
    };
  }

  return {
    visitor: {
      Function (fn: NodePath): void {
        if (fn.isArrowFunctionExpression() && !fn.get('body').isBlockStatement()) {
          // Naked arrow functions cannot contain contracts.
          return;
        }
        fn.traverse({
          Function (path: NodePath): void {
            // This will be handled by the outer visitor, so skip it.
            path.skip();
          },

          LabeledStatement (path: NodePath): void {
            const label: NodePath = path.get('label');
            let id: ?Identifier;
            let children: ?NodePath[];
            let parent: NodePath = fn;
            if (label.node.name === PRECONDITION_NAME) {
              assemblePrecondition(path);
              return;
            }
            else if (label.node.name === POSTCONDITION_NAME) {
              id = assemblePostcondition(path);
              children = fn.get('body').get('body');
            }
            else if (label.node.name === ASSERT_NAME) {
              assembleAssertion(path);
              return;
            }
            else if (label.node.name === INVARIANT_NAME) {
              id = assembleInvariant(path);
              parent = path.findParent(t.isBlockStatement);
              children = parent.get('body');
              const first: NodePath = children[0];
              first.insertBefore(t.expressionStatement(t.callExpression(id, [])))
            }
            parent.traverse({
              Function (path: NodePath): void {
                // This will be handled by the outer visitor, so skip it.
                path.skip();
              },
              ReturnStatement (statement: NodePath): void {
                statement.get('argument').replaceWith(t.callExpression(id, [statement.node.argument]));
              }
            });
            const last: NodePath = children[children.length - 1];
            if (!last.isReturnStatement()) {
              last.insertAfter(t.expressionStatement(t.callExpression(id, [])));
            }
          }
        });
      },

      LabeledStatement (path: NodePath): void {
        const label: NodePath = path.get('label');

        if (label.node.name === ASSERT_NAME) {
          assembleAssertion(path);
          return;
        }
      }
    }
  };
}
