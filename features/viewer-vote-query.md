Signed-in sketch queries now fetch only the current viewer's vote edge instead of the full `votes` relation, and signed-out queries omit `votes` entirely.

This is shared through `src/lib/sketch-query.ts` and applied across the home page, `/top`, `/best`, user galleries, sketch pages, and sketch-card hover prefetching so `UpvoteButton` still gets the right voted state without overfetching.
