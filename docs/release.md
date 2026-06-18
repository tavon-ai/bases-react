# Release Checklist

Alpha package metadata is prepared for `0.1.0-alpha.0`.

Before publishing:

1. Run `pnpm lint`.
2. Run `pnpm test`.
3. Run `pnpm typecheck`.
4. Run `pnpm build`.
5. Review `CHANGELOG.md`.
6. Confirm package `README.md`, `license`, `version`, `main`, `types`, and `exports` fields.
7. Publish packages in dependency order:
   - `@bases-react/core`
   - `@bases-react/tanstack`
   - `@bases-react/fs`
   - `@bases-react/react`

Public npm publishing is intentionally manual for the first alpha.

## Manual npm publishing

Publish scoped public packages from each package directory, in dependency order:

```bash
pnpm build

cd packages/bases-core
pnpm publish --access public --tag alpha --no-git-checks

cd ../bases-tanstack
pnpm publish --access public --tag alpha --no-git-checks

cd ../bases-fs
pnpm publish --access public --tag alpha --no-git-checks

cd ../bases-react
pnpm publish --access public --tag alpha --no-git-checks
```

Dependency order matters because `@bases-react/fs` and `@bases-react/tanstack` depend on `@bases-react/core`, and `@bases-react/react` depends on both `@bases-react/core` and `@bases-react/tanstack`.

Optional dry run:

```bash
cd packages/bases-core
pnpm publish --access public --tag alpha --dry-run --no-git-checks
```

## Manual demo deployment

The interactive Vite demo can be published to GitHub Pages manually:

```bash
pnpm deploy:demo
```

This publishes `examples/simple-react-app/dist` to the `gh-pages` branch. Configure GitHub Pages to serve from `gh-pages` / root.
