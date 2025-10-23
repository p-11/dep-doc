import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkDepDoc } from '../src/core';

function mkTmp(prefix: string) {
  return mkdtempSync(join(tmpdir(), `${prefix}-`));
}
function writeCargo(dir: string, cargoToml: string, depDocToml: string) {
  writeFileSync(join(dir, 'Cargo.toml'), cargoToml.trim() + '\n');
  writeFileSync(join(dir, 'dep-doc.toml'), depDocToml.trim() + '\n');
}

const CARGO = `
[package]
name = "demo"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = "1"

[dev-dependencies]
serde_json = "1"
`;

describe('Cargo.toml checks (core)', () => {
  test('ok all match', () => {
    const d = mkTmp('cargo-ok');
    try {
      writeCargo(
        d,
        CARGO,
        `
[[dependency]]
name = "serde"
purpose = "Serialize"
scope = "prod"

[[dependency]]
name = "serde_json"
purpose = "Fixtures"
scope = "dev"
`
      );
      const res = checkDepDoc(d);
      expect(res.ok).toBe(true);
      expect(res.label).toBe('Cargo.toml');
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });

  test('fails on missing in dep-doc', () => {
    const d = mkTmp('cargo-missing');
    try {
      writeCargo(
        d,
        CARGO,
        `
[[dependency]]
name = "serde"
purpose = "Serialize"
scope = "prod"
`
      );
      const res = checkDepDoc(d);
      expect(res.ok).toBe(false);
      expect(res.missing).toContain('serde_json');
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });

  test('fails on extra in dep-doc', () => {
    const d = mkTmp('cargo-extra');
    try {
      writeCargo(
        d,
        CARGO,
        `
[[dependency]]
name = "serde"
purpose = "Serialize"
scope = "prod"

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

  test('fails on scope mismatch', () => {
    const d = mkTmp('cargo-scope');
    try {
      writeCargo(
        d,
        CARGO,
        `
[[dependency]]
name = "serde"
purpose = "Serialize"
scope = "dev"   # should be prod
`
      );
      const res = checkDepDoc(d);
      expect(res.ok).toBe(false);
      expect(res.scopeMismatches).toEqual([
        { name: 'serde', manifestScope: 'prod', depDocScope: 'dev' }
      ]);
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });

  test('fails on schema error (unknown key)', () => {
    const d = mkTmp('cargo-schema');
    try {
      writeCargo(
        d,
        CARGO,
        `
[[dependency]]
name = "serde"
purpose = "Serialize"
scope = "prod"
extra = "nope"
`
      );
      const res = checkDepDoc(d);
      expect(res.ok).toBe(false);
      expect(res.errors?.join('\n')).toMatch(/Invalid dep-doc\.toml schema/);
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });
});
