import * as Mocha from 'mocha';
import { RunnableTask, TaskResultsObject } from 'perkulator';
import * as chalk from 'chalk';

import { TaskReporter } from './reporter';
import { ModuleMapCache } from './module-map-cache';
import { loadOptions, filterPaths } from './utils';

export interface MochaRC extends Mocha.MochaOptions {
  extension?: string | string[];
  spec?: string | string[];
  require?: string | string[];
}

let runningRunner: Mocha.Runner | null = null;

/*
 * Imports modules required in the mocha config
 */
function importRequiredModules(modules?: string | string[]): void {
  if (modules !== undefined) {
    [modules].flat().forEach((path) => {
      require(path);
    });
  }
}

export const run: RunnableTask['run'] = async function (changedPaths, update, options): Promise<TaskResultsObject> {
  const moduleMap = ModuleMapCache.loadCache();

  const { extension, spec, ...mochaOptions } = Object.assign<MochaRC, MochaRC>(
    (await loadOptions()) ?? {},
    options ?? {},
  );
  mochaOptions.reporter = undefined;

  const globs: string[] = new Array<string>().concat(spec ?? '*');
  const extensions: string[] = new Array<string>().concat(extension ?? '.js');

  const [removedTestModules, removedFiles] = filterPaths(changedPaths.remove, globs, extensions);
  const [changedTestModules, changedFiles] = filterPaths(
    [...changedPaths.add, ...changedPaths.change],
    globs,
    extensions,
  );

  removedTestModules.forEach((filePath) => moduleMap.clearModule(filePath));

  const cachedTestModules = [changedFiles, removedFiles]
    .flat()
    .reduce(
      (testModuleSet, filePath) => new Set([...moduleMap.getRootModules(filePath), ...testModuleSet]),
      new Set<string>(),
    );

  const testModulePaths = new Set([...changedTestModules, ...cachedTestModules]);

  if (testModulePaths.size === 0) {
    return {
      results: [chalk.yellow('Skipped. No changes to test files detected.')],
    };
  }

  importRequiredModules(mochaOptions.require);

  const mocha = new Mocha(mochaOptions);

  testModulePaths.forEach((modulePath) => mocha.addFile(modulePath));

  const results = await new Promise<TaskResultsObject>((resolve, reject) => {
    const handleResult = (results: TaskResultsObject): void => {
      resolve(results);
    };

    mocha.reporter(TaskReporter, { handleResult });
    runningRunner = mocha.run();
  });

  // Map and cache all files touched by mocha when all tests have passed.
  if (results.errors === undefined) {
    testModulePaths.forEach(moduleMap.mapModule);
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
