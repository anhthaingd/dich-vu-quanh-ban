import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
function sourceFiles(root) { return readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? sourceFiles(join(root, entry.name)) : /\.tsx?$/.test(entry.name) && !/\.(test|d)\.tsx?$/.test(entry.name) ? [resolve(root, entry.name)] : []); }
export function checkCoverage(root, report, expectedFiles = [...sourceFiles(root), ...(existsSync(resolve(root, '../index.ts')) ? [resolve(root, '../index.ts')] : [])]) {
  const groups = { core: { coveredLines: 0, lines: 0, branches: 0, coveredBranches: 0 }, app: { coveredLines: 0, lines: 0, branches: 0, coveredBranches: 0 } };
  const missing = expectedFiles.filter(file => !report[file]);
  if (!expectedFiles.length || missing.length) throw new Error(`Missing coverage source: ${missing.map(x => relative(root, x)).join(', ') || 'empty source'}`);
  for (const file of expectedFiles) {
    const coverage = report[file];
    const group = /[/\\](logging|http)[/\\]|catalog\.query\.ts$|catalog-api\.ts$/.test(file) ? groups.core : groups.app;
    const lines = new Map();
    for (const [id, statement] of Object.entries(coverage.statementMap)) {
      // Istanbul line coverage: a line is covered if any statement on that line ran.
      const line = statement.start.line; lines.set(line, Math.max(lines.get(line) ?? 0, coverage.s[id]));
    }
    group.lines += lines.size; group.coveredLines += [...lines.values()].filter(x => x > 0).length;
    const branches = Object.values(coverage.b).flat(); group.branches += branches.length; group.coveredBranches += branches.filter(x => x > 0).length;
  }
  const results = {};
  for (const [name, group] of Object.entries(groups)) {
    if (!group.lines) throw new Error(`Empty coverage group: ${name}`);
    const lines = 100 * group.coveredLines / group.lines; const branches = group.branches ? 100 * group.coveredBranches / group.branches : 100;
    results[name] = { lines, branches };
    if (lines < (name === 'core' ? 90 : 80) || branches < (name === 'core' ? 85 : 70)) throw new Error(`Coverage ${name}: lines=${lines.toFixed(2)} branches=${branches.toFixed(2)} below required threshold`);
  }
  return results;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { const [root, report] = process.argv.slice(2); console.log(checkCoverage(resolve(root), JSON.parse(readFileSync(report, 'utf8')))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
