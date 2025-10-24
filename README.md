# Dep Doc

A TypeScript library for linting dependency documentation.

It currently supports linting dependency documentation, via a `dep-doc.toml` file for:

- `package.json` projects (Node.js/JavaScript/TypeScript projects)
- `Cargo.toml` projects (Rust projects)

## Motivation.

Dep Doc requires that all dependencies in a project are listed in the `dep-doc.toml` file. This ensures that developers understand the purpose and usage of each dependency, leading to better maintainability and collaboration within teams.

It also makes the use of each dependency explicit, reducing the risk of unnecessary or outdated dependencies lingering in the codebase and helping to catch potential security vulnerabilities associated with unused or poorly understood dependencies.

## How it works

Dep Doc scans the project's dependency list (e.g., from `package.json`/`Cargo.toml`) and checks for the presence of a `dep-doc.toml` file in the root directory. The `dep-doc.toml` file should explain why each dependency is included, its purpose, and any relevant usage information.

The current schema for `dep-doc.toml` is as follows:

- name (string): The name of the dependency.
- purpose (string): A brief description of why the dependency is included in the project.
- scope (string, optional): The scope of the dependency (enums: "dev", "prod", "build").

```toml
[[dependency]]
name = "serde"
purpose = "Serializing stuff"
scope = "prod"

[[dependency]]
name = "leftpad"
purpose = "Utility function"
scope = "prod"
```

Linting will fail if:

- Any dependency in the project is missing from `dep-doc.toml`.
- Any dependency in `dep-doc.toml` is not present in the project.
- Any dependency in `dep-doc.toml` does not adhere to the schema (e.g., missing purpose).
- Any depedency is incorrectly scoped (e.g., a dev dependency marked as prod).

## Usage

To use Dep Doc, install it via npm:

```bash
npm install -g @project-eleven/dep-doc
```

Then, you can run the linter using the command line:

```bash
dep-doc --run
```

It can be used locally & in CI.

To get the version of dep-doc you have installed, run:

```bash
dep-doc --version
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Note on releasing:

Run `./setup.sh` to install git hooks.

You must bump the version in `package.json`before creating a release.
