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

  const preconditionAsserter: (ids: {[key: string]: Node}) => Node = template(`
    if (!condition) {
      throw new Error(message);
    }
  `);

  const functionVisitor: Visitors = {
    Function (path: NodePath): void {
      // This will be handled by the outer visitor, so skip it.
      path.skip();
    },

    LabeledStatement (path: NodePath): void {
      const label: NodePath = path.get('label');

      if (label.node.name === PRECONDITION_NAME) {
        assemblePrecondition(path);
      }

    }
  };


  function assemblePrecondition (path: NodePath): void {
    const body: NodePath = path.get('body');
    const fn: NodePath = path.getFunctionParent();
    const name: string = fn.node.id ? `"${fn.node.id.name}" `: ' ';
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
      ExpressionStatement (statement: NodePath): void {
        let condition: NodePath = statement.get('expression');
        let message;
        if (condition.isSequenceExpression()) {
          const expressions = condition.get('expressions');
          condition = expressions[0];
          message = expressions[1];
        }
        else {
          message = t.stringLiteral(`Function ${name}precondition failed: ${generate(condition.node).code}`);
        }
        statement.replaceWith(preconditionAsserter({
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

  function expression (input: string): Function {
    const fn: Function = template(input);
    return function (...args) {
      const node: Node = fn(...args);
      return getExpression(node);
    };
  }

  return {
    visitor: {
      Function (path: NodePath): void {
        if (path.isArrowFunctionExpression() && !path.get('body').isBlockStatement()) {
          // Naked arrow functions cannot contain contracts.
          return;
        }
        path.traverse(functionVisitor);
      }
    }
  };
}
