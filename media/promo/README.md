# Props Predictions promo

Continuation of Claude’s 2026-27 portrait promo, with a 3.2-second pool-scoring explanation at 21.6–24.8 seconds and a dedicated 2.8-second NBA Cup $50 mid-season payout beat at 24.8–27.6 seconds. Delivery: 1080×1920, 30 fps, 32.5 seconds, silent (as in the original).

Editable source: `render.html`, with screenshot assets in `shots/` and Fontsource fonts from the repository’s installed dependencies. Chrome and FFmpeg preserve the original canvas rendering pipeline.

From this directory: `node render.mjs 1080 1920 props-predictions-story.mp4`. Sample frames: `node render.mjs 1080 1920 unused.mp4 22.3,23.4,25.5,26.5,28.5,31.5`.

The fee, season, deadline, and past-result copy is unchanged by this revision. Review those details before reusing this promo for another season.

## Verification

The final MP4 was probed as H.264, 1080×1920, 30 fps, 32.5 seconds, with no audio stream (matching the silent original). The exported scoring and payout sequences are shown in `previews/scoring-filmstrip.jpg` and `previews/payout-filmstrip.jpg`; its individual preview frames and the mobile/desktop Cup screenshots are retained alongside it.

The Cup, Finals, and admin-question checks passed: 184 tests in 30 suites, including the Cup, Finals, submissions, and admin-question checks. Browser inspection used this branch’s local bundles with public 2026-27 picks and 2025-26 standings data. The 320px and 390px pages had no horizontal overflow; team rows are 56px tall. The production build passes with bundle-size warnings.
