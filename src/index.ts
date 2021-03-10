import * as Mocha from 'mocha';
import { RunnableTask, TaskResultsObject } from 'perkulator';
import * as chalk from 'chalk';

import { TaskReporter } from './reporter';
import { loadOptions, filterSpecPaths } from './utils';

export interface MochaRC extends Mocha.MochaOptions {
  extension?: string | string[];
  spec?: string | string[];
}

let runningRunner: Mocha.Runner | null = null;

export const run: RunnableTask['run'] = async function (changedPaths, update, options): Promise<TaskResultsObject> {
  const { extension, spec, ...mochaOptions } = Object.assign<MochaRC, MochaRC>(
    (await loadOptions()) ?? {},
    options ?? {},
  );
  mochaOptions.reporter = undefined;

  let files = Array.from(changedPaths.add).concat(changedPaths.change);
  const specFilter: string[] = new Array<string>().concat(spec ?? '*');
  const extensionFilter: string[] = new Array<string>().concat(extension ?? '.js');

  files = filterSpecPaths(files, specFilter, extensionFilter);

  if (files.length === 0) {
    return {
      results: [chalk.yellow('Skipped. No changes to test files detected.')],
    };
  }

  const mocha = new Mocha(mochaOptions);
  files.forEach((file) => mocha.addFile(file));

  const results = await new Promise<TaskResultsObject>((resolve, reject) => {
    const handleResult = (results: TaskResultsObject): void => {
      resolve(results);
    };

    mocha.reporter(TaskReporter, { handleResult });
    runningRunner = mocha.run();
  });

  mocha.unloadFiles();
  runningRunner = null;

  return results;
};

export const stop = (): void => {
  if (runningRunner !== null) {
    runningRunner.abort();
  }
};
