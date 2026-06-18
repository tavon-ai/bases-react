# Roadmap

This roadmap captures work intentionally left out of the current alpha and the main product questions to resolve before later releases.

## Current focus

- Keep the first alpha centered on standalone React usage.
- Maintain the framework-independent core engine.
- Improve compatibility through small fixtures before claiming full Obsidian parity.
- Keep persistence and host-specific behavior adapter-owned.

## Deferred feature areas

See [`../deferred-features.md`](../deferred-features.md) for the detailed deferred feature list.

High-level deferred areas:

- Cards view completion: card sizing, cover images/colors, fit/aspect controls.
- Advanced toolbar actions: clipboard/export follow-ups and richer filter editing.
- Filter dirty tracking once richer filter editing exists.
- Inline editing and persistence callbacks.
- Optional map renderer.
- Obsidian bridge and plugin demo.
- Expanded docs site and additional examples.

## Open questions

- Package scope is now `@bases-react/*`; verify npm availability before first publish.
- Should the next release continue targeting standalone React first, or start prioritizing Obsidian plugin users?
- Should date formatting aim for Moment-compatible behavior, Day.js/Luxon compatibility, or a smaller custom formatter?
- How strict should compatibility be with Obsidian Bases syntax quirks?
- Should property type icons be inferred from values/property names, or explicitly defined in `.base` column metadata?
- Should the map view live in `@bases-react/react` or a separate optional package?
- What is the smallest editing API that keeps persistence adapter-specific?

## Likely next implementation order

1. Polish alpha docs and examples as users try the standalone package.
2. Expand lightweight compatibility fixtures around real `.base` patterns.
3. Finish cards view only if gallery/card use cases become important.
4. Add editing API design before implementing editable cells.
5. Build Obsidian bridge after the standalone data model and React API stabilize.
