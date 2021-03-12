import * as Mocha from 'mocha';
import { RunnableTask, TaskResultsObject } from 'perkulator';
import * as chalk from 'chalk';

import { TaskReporter } from './reporter';
import { ModuleMapCache } from './module-map-cache';
import { loadOptions, filterPaths } from './utils';

export interface MochaRC extends Mocha.MochaOptions {
  extension?: string | string[];
  spec?: string | string[];
}

let runningRunner: Mocha.Runner | null = null;

export const run: RunnableTask['run'] = async function (changedPaths, update, options): Promise<TaskResultsObject> {
  const moduleMap = ModuleMapCache.loadCache();

  const { extension, spec, ...mochaOptions } = Object.assign<MochaRC, MochaRC>(
    (await loadOptions()) ?? {},
    options ?? {},
  );
  mochaOptions.reporter = undefined;

  // Filter paths into included and excluded
  const unfilteredPaths = Array.from(changedPaths.add).concat(changedPaths.change);
  const specFilter: string[] = new Array<string>().concat(spec ?? '*');
  const extensionFilter: string[] = new Array<string>().concat(extension ?? '.js');
  const [includedPaths, excludedPaths] = filterPaths(unfilteredPaths, specFilter, extensionFilter);

  // Retrieve all implicitly affected files and include them
  for (const path of excludedPaths) {
    const moduleRootParents = moduleMap.getRootParents(path);
    moduleRootParents?.forEach((path) => includedPaths.add(path));
  }

  if (includedPaths.size === 0) {
    return {
      results: [chalk.yellow('Skipped. No changes to test files detected.')],
    };
  }

  const mocha = new Mocha(mochaOptions);

  includedPaths.forEach((modulePath) => mocha.addFile(modulePath));

  const results = await new Promise<TaskResultsObject>((resolve, reject) => {
    const handleResult = (results: TaskResultsObject): void => {
      resolve(results);
    };

    mocha.reporter(TaskReporter, { handleResult });
    runningRunner = mocha.run();
  });

  // Map and cache all files touched by mocha when all tests have passed.
  if (results.errors === undefined) {
    includedPaths.forEach(moduleMap.mapModule);
    moduleMap.saveCache();
  }

  mocha.unloadFiles();
  runningRunner = null;

  return results;
};

export const stop = (): void => {
  if (runningRunner !== null) {
    runningRunner.abort();
  }
};
