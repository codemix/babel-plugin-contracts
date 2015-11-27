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
export default function ({types: t, template}: PluginParams): Plugin {

  const PRECONDITION_NAME = 'pre';
  const POSTCONDITION_NAME = 'post';
  const INVARIANT_NAME = 'invariant';
  const RETURN_NAME = 'it';

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
      VariableDeclaration (item: NodePath): void {
        throw path.buildCodeFrameError(`Preconditions cannot have side effects.`);
      },
      Function (item: NodePath): void {
        throw path.buildCodeFrameError(`Preconditions cannot have side effects.`);
      },
      AssignmentExpression (item: NodePath): void {
        throw path.buildCodeFrameError(`Preconditions cannot have side effects.`);
      },
      UpdateExpression (item: NodePath): void {
        throw path.buildCodeFrameError(`Preconditions cannot have side effects.`);
      },
      YieldExpression (item: NodePath): void {
        throw path.buildCodeFrameError(`Preconditions cannot have side effects.`);
      },
      ReturnStatement (item: NodePath): void {
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
        VariableDeclaration (item: NodePath): void {
          throw path.buildCodeFrameError(`Postconditions cannot have side effects.`);
        },
        Function (item: NodePath): void {
          throw path.buildCodeFrameError(`Postconditions cannot have side effects.`);
        },
        AssignmentExpression (item: NodePath): void {
          throw path.buildCodeFrameError(`Postconditions cannot have side effects.`);
        },
        UpdateExpression (item: NodePath): void {
          throw path.buildCodeFrameError(`Postconditions cannot have side effects.`);
        },
        YieldExpression (item: NodePath): void {
          throw path.buildCodeFrameError(`Postconditions cannot have side effects.`);
        },
        ReturnStatement (item: NodePath): void {
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

            if (label.node.name === PRECONDITION_NAME) {
              assemblePrecondition(path);
            }
            else if (label.node.name === POSTCONDITION_NAME) {
              const id = assemblePostcondition(path);
              let returnCount = 0;
              fn.traverse({
                Function (path: NodePath): void {
                  // This will be handled by the outer visitor, so skip it.
                  path.skip();
                },
                ReturnStatement (statement: NodePath): void {
                  returnCount++;
                  statement.get('argument').replaceWith(t.callExpression(id, [statement.node.argument]));
                }
              });
              const children: NodePath = fn.get('body').get('body');
              const last: NodePath = children[children.length - 1];
              if (!last.isReturnStatement()) {
                last.insertAfter(t.expressionStatement(t.callExpression(id, [])));
              }
            }

          }
        });
      }
    }
  };
}
