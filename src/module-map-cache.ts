import * as fs from 'fs';
import * as path from 'path';
import anymatch from 'anymatch';

interface CacheObject {
  [path: string]: string[];
}

const CACHE_LOCATION = path.resolve(process.cwd(), 'node_modules', '.perkulator_cache', '.mocha_cache');

const isInNodeModules = anymatch('**/node_modules/**/*');

/* JSON replacer that replaces the map with a mapped object and each set with an array */
function replacer(key: string, value: any): CacheObject | any {
  if (key === 'moduleMap' && value instanceof Map) {
    const cacheMap: Map<string, Set<string>> = value;
    const cacheObject: CacheObject = {};

    for (const [key, set] of cacheMap.entries()) {
      cacheObject[key] = Array.from(set);
    }

    return cacheObject;
  }

  return value;
}

/* JSON reviver that rebuilds the moduleMap from the mapped object */
function reviver(key: string, value: any): Map<string, Set<string>> | string {
  if (key === 'moduleMap') {
    const object: CacheObject = value;
    return Object.entries(object).reduce(
      (cache, [key, value]) => cache.set(key, new Set(value)),
      new Map<string, Set<string>>(),
    );
  }

  return value;
}

/* Maps and caches each child module of the provided file at n:th depth */
export class ModuleMapCache {
  private readonly cacheId: number;
  private readonly moduleMap: Map<string, Set<string>>;

  public constructor(cacheObject?: ModuleMapCache) {
    // Invalidate loaded cache if the cacheId doesn't match
    if (cacheObject?.cacheId !== process.pid) {
      cacheObject = undefined;
    }

    this.cacheId = cacheObject?.cacheId ?? process.pid;
    this.moduleMap = cacheObject?.moduleMap ?? new Map();
  }

  public static loadCache(): ModuleMapCache {
    let parsedCache: ModuleMapCache | undefined;
    try {
      parsedCache = JSON.parse(fs.readFileSync(CACHE_LOCATION, 'utf-8'), reviver);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }

    return new ModuleMapCache(parsedCache);
  }

  /*
   * Remove the mapped module and it's child references.
   */
  public clearModule(moduleId: string): void {
    const nestedChildren = this.moduleMap.get(moduleId);

    nestedChildren?.forEach((childId) => {
      const rootParents = this.moduleMap.get(childId);

      if (rootParents !== undefined) {
        rootParents.delete(moduleId);
        rootParents.size === 0 && this.moduleMap.delete(childId);
      }
    });

    this.moduleMap.delete(moduleId);
  }

  public getRootModules(childModuleId: string): string[] {
    return Array.from(this.moduleMap.get(childModuleId) ?? []);
  }

  /*
   * Recursively map the given module and it's children.
   * The module map will be rebuilt from the ground up each time it's being mapped.
   * This ensures up to date references to all children and prevents outdated references.
   */
  public mapModule(moduleId: string, childModuleId?: string): void {
    childModuleId === undefined && this.clearModule(moduleId);
    const moduleChildren = require.cache[childModuleId ?? moduleId]?.children;

    if (!this.moduleMap.has(moduleId)) {
      this.moduleMap.set(moduleId, new Set());
    }

    const mappedModuleChildIds = this.moduleMap.get(moduleId);

    moduleChildren?.forEach((childModule) => {
      if (!isInNodeModules(childModule.id)) {
        mappedModuleChildIds?.add(childModule.id);

        if (!this.moduleMap.has(childModule.id)) {
          this.moduleMap.set(childModule.id, new Set());
        }

        this.moduleMap.get(childModule.id)?.add(moduleId);
        this.mapModule(moduleId, childModule.id);
      }
    });
  }

  public saveCache(): void {
    const stringifiedCache = JSON.stringify(this, replacer);
    fs.writeFileSync(CACHE_LOCATION, stringifiedCache, 'utf-8');
  }
}
