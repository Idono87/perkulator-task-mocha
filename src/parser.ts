import { Suite, Test } from 'mocha';
import { TaskResultsObject } from 'perkulator';
import * as chalk from 'chalk';
import * as inspect from 'object-inspect';
import * as diff from 'diff';

interface DiffError extends Error {
  showDiff?: boolean;
  actual: any;
  expected: any;
  operator: string;
}

class Parser {
  private readonly rootSuite: Suite;
  private readonly suitNestedTitles: string[] = [];
  private currentFile: string = '';
  private readonly failedTests: string[] = [];
  private testCount: number = 0;

  public constructor(suite: Suite) {
    this.rootSuite = suite;
  }

  public parse(): TaskResultsObject {
    this.parseSuite(this.rootSuite);

    const resultsObject: TaskResultsObject = {
      results: [buildResults(this.testCount, this.failedTests.length)],
    };
    this.failedTests.length > 0 && (resultsObject.errors = this.failedTests);

    return resultsObject;
  }

  private parseSuite(suite: Suite): void {
    if (!suite.root) {
      this.suitNestedTitles.push(suite.title);
      this.currentFile = suite.file ?? '';
    }

    for (const test of suite.tests) {
      this.parseTest(test);
    }

    for (const childSuite of suite.suites) {
      this.parseSuite(childSuite);
    }

    this.suitNestedTitles.pop();
  }

  private parseTest(test: Test): void {
    this.testCount++;

    if (test.err !== undefined) {
      this.failedTests.push(buildMessage(test.title, this.currentFile, test.err as DiffError, this.suitNestedTitles));
    }
  }
}

export function parseResults(suite: Suite): TaskResultsObject {
  return new Parser(suite).parse();
}

function buildMessage(title: string, file: string, err: DiffError, suiteTitles: string[]): string {
  let header = suiteTitles.map<string>((title, indentLength) => chalk`{blue ${title}} {green -> }`).join('');
  header = chalk`❌ ${header}{yellow ${title}}\n📁 {gray.underline ${file}}`;

  let body: string;
  if (err.showDiff === true) {
    const diffResults = diff.diffJson(
      inspect(err.expected).replace(/\\n/g, '\n'),
      inspect(err.actual).replace(/\\n/g, '\n'),
    );

    body = chalk`{redBright ${indent(0)}${err.name}: ${err.message}}\n\n${parseDiff(diffResults)}`;
  } else {
    body = chalk`{red ${
      err.stack
        ?.split(/\\n/)
        .map((line, index) => `${index > 0 ? indent(1) : indent(0)}${line}`)
        .join('\\n') ?? `${err.name}: ${err.message}`
    }}`;
  }

  return `${header}\n\n${body}\n\n\n\n\n`;
}

function indent(count: number): string {
  const indent = `  `;
  let str = ``;
  for (let i = 0; i <= count; i++) {
    str = `${str}${indent}`;
  }

  return str;
}

function parseDiff(diffResults: diff.Change[]): string {
  const diffLines = diffResults
    .map<string[]>((change, indent) => {
      if (change.added === true) {
        return change.value
          .split(/\n/g)
          .filter((line) => line !== '')
          .map((line) => chalk`{green - ${line}}`);
      }

      if (change.removed === true) {
        return change.value
          .split(/\n/g)
          .filter((line) => line !== '')
          .map((line) => chalk`{red + ${line}}`);
      }

      return change.value
        .split(/\n/g)
        .filter((line) => line !== '')
        .map((line) => chalk`{white   ${line}}`);
    })
    .flat();

  // Strip quotes from first and last line
  diffLines[0] = diffLines[0].replace(/'/g, '');
  diffLines[diffLines.length - 1] = diffLines[diffLines.length - 1].replace(/'/g, '');

  return diffLines.map((line) => `${indent(0)}${line}`).join('\n');
}

function buildResults(testCount: number, failedCount: number): string {
  return chalk`\n\n{green ✓ ${testCount - failedCount} passed}\n${
    failedCount > 0 ? chalk`❌ {red ${failedCount} failed}\n` : ''
  }\n`;
}
