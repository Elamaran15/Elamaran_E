# Cinematic video assets

Drop the Higgsfield Seedance 2.0 clips here (see BUILD-PLAN.md §5–6), encoded for scrubbing (`-g 1`):

| File | Scene | Used in |
|---|---|---|
| `hero-orbit.mp4` / `hero-orbit-m.mp4` | 1 · Hero Orbit | Hero (or use the image sequence in `assets/seq/hero/`) |
| `builder.mp4` / `builder-m.mp4` | 2 · The Builder | Story section |
| `gallery.mp4` / `gallery-m.mp4` | 3 · The Gallery | Final CTA |

Then flip the matching flag in the `MEDIA` object at the top of `script.js` to `true`.
Until then every scene renders its built-in procedural fallback.
