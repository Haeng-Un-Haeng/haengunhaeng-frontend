import assert from 'node:assert/strict';
import { Linter } from 'eslint';
import * as prettier from 'prettier';
import rule from './wrap-cn.mjs';

const linter = new Linter();
const config = [
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { local: { rules: { 'wrap-cn': rule } } },
    rules: { 'local/wrap-cn': ['error', { maxLength: 50 }] },
  },
];
const long =
  'rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-bold shadow-sm';
const fix = (code) => {
  const result = linter.verifyAndFix(code, config);
  assert.deepEqual(result.messages, []);
  return result.output;
};
const initial =
  "'use client';\nexport const View = () => <><div className=\"" +
  long +
  '"/><div className="' +
  long +
  '"/></>;';
const converted = fix(initial);
assert.equal((converted.match(/import /g) ?? []).length, 1);
assert.ok(
  converted.indexOf("'use client'") < converted.indexOf('import '),
);
assert.match(converted, /className=\{cn\(/);
assert.equal(fix(converted), converted);

const imported = "import { cn as styles } from '@/shared/lib/cn';\n";
const reuse = fix(
  imported + 'const View = () => <div className="' + long + '"/>;',
);
assert.match(reuse, /className=\{styles\(/);
assert.equal((reuse.match(/import /g) ?? []).length, 1);

const shadowed = fix(
  imported +
    'function View(styles) { return <div className="' +
    long +
    '"/>; }',
);
assert.match(shadowed, /cn as cnClasses1/);
assert.match(shadowed, /className=\{cnClasses1\(/);

const collision = fix(
  'const cn = 1; const View = () => <div className="' + long + '"/>;',
);
assert.match(collision, /cn as cnClasses1/);

const dynamic =
  imported +
  'const result = styles("' +
  long +
  '", selected && "ring-2", className);';
const split = fix(dynamic);
assert.ok(split.includes('selected && "ring-2", className'));
assert.ok(split.includes('",\n"'));

for (const unchanged of [
  'const View = () => <div className="flex gap-2"/>;',
  'const View = () => <div className={value}/>;',
  'const cn = (x) => x; cn("' + long + '");',
  imported + 'function f(styles) { return styles("' + long + '"); }',
  imported + 'styles(`px-2 ${value} ' + long + '`);',
])
  assert.equal(fix(unchanged), unchanged);

const template = fix(imported + 'styles(`' + long + '`);');
assert.ok(template.includes('",\n"'));

const formatted = await prettier.format(converted, {
  parser: 'babel',
  printWidth: 70,
  singleQuote: true,
});
assert.equal(fix(formatted), formatted);
assert.equal(
  await prettier.format(fix(formatted), {
    parser: 'babel',
    printWidth: 70,
    singleQuote: true,
  }),
  formatted,
);
process.stdout.write(
  'cn auto-fix: imports, shadowing, static strings, dynamic expressions, and format stability passed.\n',
);
