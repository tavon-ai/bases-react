# Contributing

Thanks for helping improve Obsidian Bases React.

## Local workflow

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm lint
```

## Development guidelines

- Keep `@bases-react/core` framework-independent.
- Put React UI in `@bases-react/react`.
- Put TanStack-specific table integration in `@bases-react/tanstack`.
- Keep adapters responsible for data loading and persistence.
- Add fixtures/tests for supported `.base` syntax before expanding compatibility claims.

## Compatibility

This project targets a documented subset first. Update `docs/compatibility.md` when adding or deferring features.
