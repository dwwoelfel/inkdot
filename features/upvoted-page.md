# Upvoted Page

## What it does
Adds a page where signed-in users can browse the sketches they have upvoted.

## Implementation
- Add a `/upvoted` route that queries top-level `votes` ordered by vote time descending
- Fetch each vote's linked sketch card data so the page can reuse the existing gallery card UI
- Show a signed-in-only menu link so the page is discoverable from anywhere
- Reuse the existing browse header and pagination treatment

## Changes after implementation
- Added `/upvoted` at `src/app/upvoted/page.tsx`
- The route queries top-level `votes` ordered by vote time and normalizes the nested sketch relation into the existing `SketchCard` shape
- Signed-out users get a sign-in prompt, and guest users get a lightweight “link an email” empty state because they cannot vote
- Added an `Upvoted` item to the signed-in header menu
- Moved the route query into the shared `upvotedPageQuery(...)` builder in `src/lib/browse-queries.ts` so it follows the same pattern as the other browse pages
