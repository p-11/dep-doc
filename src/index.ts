#!/usr/bin/env node
import packageJson from '../package.json';
import { checkDepDoc } from './core';
import { logError, logSuccess, logInfo } from './log';

function getPackageVersion(): string {
  return typeof packageJson.version === 'string'
    ? packageJson.version
    : 'unknown';
}

function runDepDoc(baseDir: string): number {
  const res = checkDepDoc(baseDir);

  if (res.ok) {
    logSuccess(`dep-doc valid (${res.label})`);
    return 0;
  }

  if (res.errors?.length) {
    for (const e of res.errors) logError(e);
    return 1;
  }

  logError(`dep-doc failed (${res.label}):`);
  if (res.missing.length) {
    logError('  Missing in dep-doc.toml:');
    for (const m of res.missing) logError(`    - ${m}`);
  }
  if (res.extra.length) {
    logError('  Present in dep-doc.toml but not in manifest:');
    for (const e of res.extra) logError(`    - ${e}`);
  }
  if (res.scopeMismatches.length) {
    logError('  Scope mismatches between dep-doc.toml and manifest:');
    for (const s of res.scopeMismatches) {
      logError(
        `    - ${s.name}: dep-doc.toml=${s.depDocScope}, manifest=${s.manifestScope}`
      );
    }
  }
  return 1;
}

function main() {
  const [arg] = process.argv.slice(2);
  const baseDir = process.env.DEPDOC_BASE_DIR || process.cwd();

  if (arg === '--version') {
    const version = getPackageVersion();
    logInfo(`version: ${version}`);
    process.exit(0);
  }

  if (arg === undefined || arg === '--run') {
    const exitCode = runDepDoc(baseDir);
    process.exit(exitCode);
  }

  logError(`Unknown option: ${arg}`);
  logError('Usage: dep-doc [--run | --version]');
  process.exit(1);
}

main();
