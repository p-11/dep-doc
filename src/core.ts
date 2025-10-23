import fs from 'fs';
import path from 'path';
import * as TOML from 'toml';
import { z } from 'zod';

// ----- Schema -----
const DepDocEntrySchema = z
  .object({
    name: z.string().min(1, 'name must be non-empty'),
    purpose: z.string().min(1, 'purpose must be non-empty'),
    scope: z.enum(['prod', 'dev', 'build'])
  })
  .strict();

const DepDocSchema = z.object({
  dependency: z
    .array(DepDocEntrySchema)
    .nonempty('dep-doc.toml must have at least one [[dependency]] entry')
});

type Scope = z.infer<typeof DepDocEntrySchema>['scope'];

type ManifestInventory = {
  label: 'package.json' | 'Cargo.toml';
  names: string[];
  scopeByName: Record<string, Scope>;
};

export type ScopeMismatch = {
  name: string;
  manifestScope: Scope;
  depDocScope: Scope;
};

export type DepDocResult = {
  ok: boolean;
  label: 'package.json' | 'Cargo.toml';
  missing: string[];
  extra: string[];
  scopeMismatches: ScopeMismatch[];
  errors?: string[]; // schema or IO errors, if any
};

// ----- Helpers -----
function readTomlFile<T>(file: string, schema?: z.ZodSchema<T>): T {
  if (!fs.existsSync(file)) throw new Error(`${file} not found`);
  const parsed = TOML.parse(fs.readFileSync(file, 'utf8'));
  if (!schema) return parsed as unknown as T;
  const res = schema.safeParse(parsed);
  if (!res.success) {
    const issues = res.error.issues.map(
      i => `- ${i.path.join('.') || '(root)'}: ${i.message}`
    );
    throw new Error(`Invalid dep-doc.toml schema:\n${issues.join('\n')}`);
  }
  return res.data;
}

function loadDepDocFile(baseDir: string): {
  names: string[];
  scopes: Record<string, Scope>;
} {
  const p = path.join(baseDir, 'dep-doc.toml');
  const data = readTomlFile(p, DepDocSchema);
  const set = new Set<string>();
  const scopes: Record<string, Scope> = {};
  for (const d of data.dependency) {
    const n = d.name.trim();
    set.add(n);
    scopes[n] = d.scope;
  }
  return { names: [...set].sort(), scopes };
}

function listPkgDeps(baseDir: string): ManifestInventory {
  const p = path.join(baseDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(p, 'utf8')) as {
    dependencies?: Record<string, unknown>;
    devDependencies?: Record<string, unknown>;
  };
  const scopeByName: Record<string, Scope> = {};
  for (const n of Object.keys(pkg.dependencies ?? {})) scopeByName[n] = 'prod';
  for (const n of Object.keys(pkg.devDependencies ?? {}))
    if (!(n in scopeByName)) scopeByName[n] = 'dev';
  return {
    label: 'package.json',
    names: Object.keys(scopeByName).sort(),
    scopeByName
  };
}

type CargoDependencyValue = string | Record<string, unknown>;
type CargoDependencyTable = Record<string, CargoDependencyValue>;
interface CargoToml {
  dependencies?: CargoDependencyTable;
  'dev-dependencies'?: CargoDependencyTable;
  'build-dependencies'?: CargoDependencyTable;
}

function listCargoDeps(baseDir: string): ManifestInventory {
  const p = path.join(baseDir, 'Cargo.toml');
  const cargo = readTomlFile<CargoToml>(p);
  const scopeByName: Record<string, Scope> = {};
  const add = (tbl: CargoDependencyTable | undefined, scope: Scope) => {
    if (!tbl) return;
    for (const n of Object.keys(tbl)) {
      if (scope === 'prod' || scopeByName[n] === undefined)
        scopeByName[n] = scope;
    }
  };
  add(cargo.dependencies, 'prod');
  add(cargo['dev-dependencies'], 'dev');
  add(cargo['build-dependencies'], 'build');
  return {
    label: 'Cargo.toml',
    names: Object.keys(scopeByName).sort(),
    scopeByName
  };
}

// ----- Public API -----
export function checkDepDoc(baseDir: string): DepDocResult {
  try {
    const hasPkg = fs.existsSync(path.join(baseDir, 'package.json'));
    const hasCargo = fs.existsSync(path.join(baseDir, 'Cargo.toml'));
    if (!hasPkg && !hasCargo)
      throw new Error('No package.json or Cargo.toml found.');

    const depDoc = loadDepDocFile(baseDir);
    const manifest = hasPkg ? listPkgDeps(baseDir) : listCargoDeps(baseDir);

    const missing = manifest.names.filter(d => !depDoc.names.includes(d));
    const extra = depDoc.names.filter(r => !manifest.names.includes(r));
    const scopeMismatches: ScopeMismatch[] = depDoc.names
      .map(name => {
        const m = manifest.scopeByName[name];
        const r = depDoc.scopes[name];
        return m && m !== r ? { name, manifestScope: m, depDocScope: r } : null;
      })
      .filter((x): x is ScopeMismatch => x !== null);

    return {
      ok:
        missing.length === 0 &&
        extra.length === 0 &&
        scopeMismatches.length === 0,
      label: manifest.label,
      missing,
      extra,
      scopeMismatches
    };
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      label: hasCargoOrPkg(baseDir),
      missing: [],
      extra: [],
      scopeMismatches: [],
      errors: [errorMessage]
    };
  }
}

function hasCargoOrPkg(baseDir: string): 'package.json' | 'Cargo.toml' {
  if (fs.existsSync(path.join(baseDir, 'package.json'))) return 'package.json';
  if (fs.existsSync(path.join(baseDir, 'Cargo.toml'))) return 'Cargo.toml';
  // default label when neither exists (for error packaging)
  return 'package.json';
}
