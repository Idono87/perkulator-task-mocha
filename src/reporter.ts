import * as chalk from 'chalk';
import { MochaOptions, reporters, Runner, Suite } from 'mocha';
import { TaskResultsObject } from 'perkulator';
import { parseResults } from './parser';

const { EVENT_RUN_END, EVENT_SUITE_BEGIN } = Runner.constants;

export class TaskReporter extends reporters.Base {
  private rootSuite: Suite | null = null;
  private readonly resultsListener: (results: TaskResultsObject) => void;

  public constructor(runner: Runner, options?: MochaOptions) {
    super(runner, options);

    this.resultsListener = options?.reporterOptions.handleResult;

    runner.on(EVENT_SUITE_BEGIN, this.suiteBegin.bind(this));
    runner.on(EVENT_RUN_END, this.runEnd.bind(this));
  }

  private suiteBegin(suite: Suite): void {
    if (suite.root) {
      this.rootSuite = suite;
    }
  }

  private runEnd(): void {
    this.resultsListener(
      this.rootSuite !== null
        ? parseResults(this.rootSuite)
        : {
            results: [chalk`{blue Could not find any tests}`],
          },
    );
  }
}
