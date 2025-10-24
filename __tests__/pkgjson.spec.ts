import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkDepDoc } from '../src/core';

function mkTmp(prefix: string) {
  return mkdtempSync(join(tmpdir(), `${prefix}-`));
}
function writePkg(dir: string, pkgJson: unknown, depDocToml: string) {
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkgJson, null, 2));
  writeFileSync(join(dir, 'dep-doc.toml'), depDocToml.trim() + '\n');
}

describe('package.json checks (core)', () => {
  test('ok when all match', () => {
    const d = mkTmp('pkg-ok');
    try {
      writePkg(
        d,
        {
          dependencies: { lodash: '^4.17.21' },
          devDependencies: { prettier: '^3.6.2' }
        },
        `
[[dependency]]
name = "lodash"
purpose = "Utility lib"
scope = "prod"

[[dependency]]
name = "prettier"
purpose = "Formatter"
scope = "dev"
`
      );
      const res = checkDepDoc(d);
      expect(res.ok).toBe(true);
      expect(res.label).toBe('package.json');
      expect(res.missing).toHaveLength(0);
      expect(res.extra).toHaveLength(0);
      expect(res.scopeMismatches).toHaveLength(0);
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });

  test('fails on missing in dep-doc', () => {
    const d = mkTmp('pkg-missing');
    try {
      writePkg(
        d,
        { dependencies: { lodash: '^4.17.21' } },
        `
[[dependency]]
name = "prettier"
purpose = "Formatter"
scope = "dev"
`
      );
      const res = checkDepDoc(d);
      expect(res.ok).toBe(false);
      expect(res.missing).toContain('lodash');
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });

  test('fails on extra in dep-doc', () => {
    const d = mkTmp('pkg-extra');
    try {
      writePkg(
        d,
        { dependencies: { lodash: '^4.17.21' } },
        `
[[dependency]]
name = "lodash"
purpose = "Utility lib"
scope = "prod"

[[dependency]]
name = "prettier"
purpose = "Formatter"
scope = "dev"

[[dependency]]
name = "leftpad"
purpose = "Nope"
scope = "prod"
`
      );
      const res = checkDepDoc(d);
      expect(res.ok).toBe(false);
      expect(res.extra).toContain('leftpad');
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });

  test('fails on scope mismatch (dev vs prod)', () => {
    const d = mkTmp('pkg-scope');
    try {
      writePkg(
        d,
        { devDependencies: { prettier: '^3.6.2' } },
        `
[[dependency]]
name = "prettier"
purpose = "Formatter"
scope = "prod"
`
      );
      const res = checkDepDoc(d);
      expect(res.ok).toBe(false);
      expect(res.scopeMismatches).toEqual([
        { name: 'prettier', manifestScope: 'dev', depDocScope: 'prod' }
      ]);
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });

  test('fails on schema error (missing scope)', () => {
    const d = mkTmp('pkg-schema');
    try {
      writePkg(
        d,
        { dependencies: { lodash: '^4.17.21' } },
        `
[[dependency]]
name = "lodash"
purpose = "Utility lib"
# scope missing
`
      );
      const res = checkDepDoc(d);
      expect(res.ok).toBe(false);
      expect(res.errors?.join('\n')).toMatch(/Invalid dep-doc\.toml schema/);
      expect(res.errors?.join('\n')).toMatch(/dependency\.0\.scope/);
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });
});
