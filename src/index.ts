#!/usr/bin/env node
import { checkDepDoc } from './core';
import { logError, logSuccess } from './log';

function main() {
  const baseDir = process.env.DEPDOC_BASE_DIR || process.cwd();
  const res = checkDepDoc(baseDir);

  if (res.ok) {
    logSuccess(`dep-doc valid (${res.label})`);
    process.exit(0);
  }

  // structured errors
  if (res.errors?.length) {
    for (const e of res.errors) logError(e);
    process.exit(1);
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
  process.exit(1);
}

main();
