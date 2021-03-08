import * as path from 'path';
import anymatch from 'anymatch';

export function filterSpecPaths(filePaths: string[], spec: string[] = ['**/*'], extensions?: string[]): string[] {
  const fileExtensions = extensions === undefined ? '' : `{${extensions?.join(',')}}`;

  const includeGlobList = spec.map((specPath) =>
    path.extname(specPath) === '' ? `${specPath}${fileExtensions}` : specPath,
  );

  const matcher = anymatch(includeGlobList);

  return filePaths.filter((filePath) => matcher(filePath));
}
