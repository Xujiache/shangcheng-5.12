#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sourceRoot = path.join(projectRoot, 'entry/src/main/ets');
const strict = process.argv.includes('--strict');

function filesIn(folder) {
  const result = [];
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const current = path.join(folder, entry.name);
    if (entry.isDirectory()) result.push(...filesIn(current));
    else if (current.endsWith('.ets')) result.push(current);
  }
  return result;
}

function lineOf(source, index) {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (source.charCodeAt(cursor) === 10) line += 1;
  }
  return line;
}

function scan(source) {
  const findings = [];
  const callStack = [];
  let token = '';
  let lastToken = '';
  let index = 0;

  const flushToken = () => {
    if (token) {
      lastToken = token;
      token = '';
    }
  };
  const localized = () => callStack.some((name) =>
    name === 'I18n.text' || name === 'I18n.current' || name === 'I18n.contract');

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '/' && next === '/') {
      flushToken();
      index += 2;
      while (index < source.length && source[index] !== '\n') index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      flushToken();
      index += 2;
      while (index + 1 < source.length && !(source[index] === '*' && source[index + 1] === '/')) index += 1;
      index += 2;
      continue;
    }
    if (/[A-Za-z0-9_.$]/.test(char)) {
      token += char;
      index += 1;
      continue;
    }
    if (char === '(') {
      flushToken();
      callStack.push(lastToken);
      lastToken = '';
      index += 1;
      continue;
    }
    if (char === ')') {
      flushToken();
      callStack.pop();
      lastToken = '';
      index += 1;
      continue;
    }
    if (char === '\'' || char === '"' || char === '`') {
      flushToken();
      const quote = char;
      const start = index;
      let value = '';
      index += 1;
      while (index < source.length) {
        if (source[index] === '\\') {
          value += source.slice(index, index + 2);
          index += 2;
          continue;
        }
        if (source[index] === quote) {
          index += 1;
          break;
        }
        value += source[index];
        index += 1;
      }
      if (/\p{Script=Han}/u.test(value) && !localized()) {
        findings.push({ line: lineOf(source, start), value: value.replace(/\s+/g, ' ').slice(0, 90) });
      }
      lastToken = 'literal';
      continue;
    }
    flushToken();
    if (!/\s/.test(char)) lastToken = char;
    index += 1;
  }
  return findings;
}

const report = [];
for (const file of filesIn(sourceRoot).sort()) {
  const findings = scan(fs.readFileSync(file, 'utf8'));
  if (findings.length) report.push({ file: path.relative(projectRoot, file), findings });
}

const total = report.reduce((sum, item) => sum + item.findings.length, 0);
if (total === 0) {
  console.log('Native i18n audit passed: no unlocalized Chinese literals.');
  process.exit(0);
}

console.log(`Native i18n audit: ${total} unlocalized literal(s) remain in ${report.length} file(s).`);
for (const item of report.slice(0, 20)) {
  const examples = item.findings.slice(0, 2).map((entry) => `${entry.line}:${entry.value}`).join(' | ');
  console.log(`  ${item.findings.length.toString().padStart(3)} ${item.file}  ${examples}`);
}
if (report.length > 20) console.log(`  ... ${report.length - 20} more file(s)`);
if (strict) process.exit(1);
