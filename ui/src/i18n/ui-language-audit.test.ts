import ts from 'typescript';
import { describe, expect, test } from 'vitest';

const sourceFiles = import.meta.glob('../**/*.tsx', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;
const translatableAttributes = new Set([
  'aria-label',
  'title',
  'placeholder',
  'alt',
  'label',
  'hint',
  'description',
  'emptyTitle',
  'emptyBody',
]);
const allowedExactText = new Set([
  'Lattice',
  'AI',
  'API',
  'URL',
  'JSON',
  'CSS',
  'Email',
  'React',
  'Wails',
  'Supabase',
  'Cmd',
  'Ctrl',
  'Esc',
  'esc',
  'gpt-4o-mini',
  'sk-…',
  '(⌘N)',
]);

function shouldTranslate(text: string): boolean {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized || allowedExactText.has(normalized)) return false;
  if (/^[A-Z]$/u.test(normalized)) return false;
  if (/^[\d\s×•—–·…⌘⇧⌥↵↑↓←→+()[\]{}.,:;!?/\\_-]+$/u.test(normalized)) return false;
  if (/^https?:\/\//u.test(normalized) || normalized.includes('@')) return false;
  if (/^[•*]+$/u.test(normalized)) return false;
  return /[A-Za-z\p{Script=Han}]/u.test(normalized);
}

function staticExpressionTexts(expression: ts.Expression | undefined): string[] {
  if (!expression) return [];
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return [expression.text];
  }
  if (ts.isConditionalExpression(expression)) {
    return [
      ...staticExpressionTexts(expression.whenTrue),
      ...staticExpressionTexts(expression.whenFalse),
    ];
  }
  if (ts.isTemplateExpression(expression)) {
    return [
      expression.head.text,
      ...expression.templateSpans.map((span) => span.literal.text),
    ];
  }
  return [];
}

function auditFile(file: string, sourceText: string): string[] {
  if (file.endsWith('components/Dialogs.tsx')) {
    // 旧 Insights/Health 演示组件没有任何生产引用，不属于当前可访问界面。
    const legacyStart = sourceText.indexOf('export function InsightsDialog');
    if (legacyStart >= 0) sourceText = sourceText.slice(0, legacyStart);
  }
  const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const violations: string[] = [];
  const report = (node: ts.Node, text: string, kind: string) => {
    if (!shouldTranslate(text)) return;
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    violations.push(`${file.replace('../', '')}:${line} [${kind}] ${text.replace(/\s+/g, ' ').trim()}`);
  };

  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      report(node, node.text, 'jsx-text');
    }
    if (ts.isJsxAttribute(node) && translatableAttributes.has(node.name.getText(source))) {
      if (node.initializer && ts.isStringLiteral(node.initializer)) {
        report(node, node.initializer.text, 'attribute');
      } else if (node.initializer && ts.isJsxExpression(node.initializer)) {
        for (const text of staticExpressionTexts(node.initializer.expression)) {
          report(node, text, 'attribute-expression');
        }
      }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (['flashToast', 'setToast'].includes(node.expression.text)) {
        for (const text of staticExpressionTexts(node.arguments[0])) {
          report(node, text, 'toast');
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return violations;
}

describe('全界面语言硬编码门禁', () => {
  // REQ-023-AC-008：全部系统 UI 文案必须来自 i18n，品牌与纯技术标记除外。
  test('生产 TSX 不包含未登记的可见硬编码文案', () => {
    const violations = Object.entries(sourceFiles)
      .filter(([file]) => !file.includes('.test.'))
      .flatMap(([file, source]) => auditFile(file, source));
    expect(violations, violations.join('\n')).toEqual([]);
  });
});
