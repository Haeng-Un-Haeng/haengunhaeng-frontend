const modulePath = '@/shared/lib/cn';

function binding(source, node, name) {
  for (
    let scope = source.getScope(node);
    scope;
    scope = scope.upper
  ) {
    if (scope.set.has(name)) return scope.set.get(name);
  }
}

function isCn(variable) {
  return variable?.defs.some(
    (def) =>
      def.type === 'ImportBinding' &&
      def.parent.source.value === modulePath &&
      def.parent.importKind !== 'type' &&
      def.node.importKind !== 'type' &&
      def.node.type === 'ImportSpecifier' &&
      def.node.imported.name === 'cn',
  );
}

function staticText(node) {
  if (node?.type === 'Literal' && typeof node.value === 'string')
    return node.value;
  if (
    node?.type === 'TemplateLiteral' &&
    node.expressions.length === 0
  )
    return node.quasis[0].value.cooked;
}

function chunks(text, width) {
  const words = text.trim().split(/\s+/u);
  const result = [];
  for (const word of words) {
    const last = result.length - 1;
    if (last >= 0 && result[last].length + word.length + 1 <= width)
      result[last] += ' ' + word;
    else result.push(word);
  }
  return result;
}

const wrapCn = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Wrap long static class names with the shared cn helper',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: { maxLength: { type: 'integer', minimum: 20 } },
        additionalProperties: false,
      },
    ],
    messages: { wrap: '긴 클래스를 cn의 짧은 문자열 인자로 분리' },
  },
  create(context) {
    const source = context.sourceCode;
    const width = context.options[0]?.maxLength ?? 50;
    const changes = [];
    let needsImport = false;
    // Avoid both top-level collisions and nested bindings shadowing a new import.
    const names = new Set(
      source.ast.tokens.map((token) => token.value),
    );
    let importName = 'cn';
    for (let n = 1; names.has(importName); n++)
      importName = 'cnClasses' + n;

    const argumentsText = (text) =>
      chunks(text, width)
        .map((part) => JSON.stringify(part))
        .join(',\n');

    return {
      JSXAttribute(node) {
        if (node.name.name !== 'className') return;
        const value =
          node.value?.type === 'JSXExpressionContainer'
            ? node.value.expression
            : node.value;
        const text = staticText(value);
        if (!text || text.length <= width) return;
        // Comments inside expression containers must not be removed by replacement.
        if (source.getCommentsInside(node).length) return;
        const imported = source.ast.body
          .filter(
            (item) =>
              item.type === 'ImportDeclaration' &&
              item.source.value === modulePath,
          )
          .flatMap((item) => item.specifiers)
          .find((item) =>
            isCn(binding(source, node, item.local.name)),
          );
        const name = imported?.local.name ?? importName;
        if (!imported) needsImport = true;
        changes.push({
          node: node.value,
          text: '{' + name + '(\n' + argumentsText(text) + '\n)}',
        });
      },
      CallExpression(node) {
        if (
          node.callee.type !== 'Identifier' ||
          !isCn(binding(source, node, node.callee.name))
        )
          return;
        for (const argument of node.arguments) {
          const text = staticText(argument);
          if (
            !text ||
            text.length <= width ||
            chunks(text, width).length < 2
          )
            continue;
          changes.push({ node: argument, text: argumentsText(text) });
        }
      },
      'Program:exit'(program) {
        if (!changes.length) return;
        context.report({
          node: changes[0].node,
          messageId: 'wrap',
          fix(fixer) {
            const fixes = changes.map((change) =>
              fixer.replaceText(change.node, change.text),
            );
            if (needsImport) {
              const declaration =
                'import { cn' +
                (importName === 'cn' ? '' : ' as ' + importName) +
                " } from '" +
                modulePath +
                "';\n";
              const imports = program.body.filter(
                (node) => node.type === 'ImportDeclaration',
              );
              const directives = program.body.filter(
                (node) =>
                  node.type === 'ExpressionStatement' &&
                  node.directive,
              );
              const anchor = imports.at(-1) ?? directives.at(-1);
              if (anchor)
                fixes.push(
                  fixer.insertTextAfter(anchor, '\n' + declaration),
                );
              else {
                const shebang = source
                  .getAllComments()
                  .find((comment) => comment.type === 'Shebang');
                fixes.push(
                  fixer.insertTextBeforeRange(
                    [shebang ? shebang.range[1] : 0, 0],
                    (shebang ? '\n' : '') + declaration,
                  ),
                );
              }
            }
            return fixes;
          },
        });
      },
    };
  },
};

export default wrapCn;
