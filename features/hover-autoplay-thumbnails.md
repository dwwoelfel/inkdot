# Hover-to-Autoplay Gallery Thumbnails

## What it does
When a user hovers over a completed sketch thumbnail in the gallery, the drawing replays as an animation at the user's saved playback speed. Moving the mouse away stops the replay and shows the static thumbnail again.

## Implementation

### ReplayThumbnail component (in `src/app/components.tsx`)
- Reads stream data via `db.streams.createReadStream({ streamId })`
- Parses all events into an array, then replays using `requestAnimationFrame` loop
- Uses `renderEventsToCanvas` for full redraws (loop restart, relocate/delete/bg)
- Uses `processEventIncremental` for frame-by-frame replay
- Plays at the user's saved playback speed (from `userSettings.playbackSpeed`, default 2x)
- Respects `trimStart`/`trimEnd`
- Loops automatically when reaching the end

### SketchCard changes
- Add `isHovering` state
- Add `onMouseEnter`/`onMouseLeave` on the card's `<Link>`
- When hovering a completed sketch with a stream: render `<ReplayThumbnail>` on top of the static thumbnail
- When not hovering or live: keep current behavior

### Key design decisions
- Stream data loaded once on mount; replay starts from parsed events (no re-reading on loop)
- Component unmounts on mouse leave, cancelling stream read + animation frame
- Canvas layered on top of thumbnail image (via `absolute inset-0`) to avoid flicker on mount
- `playbackSpeed` queried once at gallery level (`GalleryContent`/`UserGalleryContent`) and passed as prop to avoid N queries for N cards
- Uses index-based slicing instead of `.filter()` per frame for better perf
- `redrawUpTo` helper consolidates full-redraw logic and syncs `replayState`

### Files modified
- `src/app/components.tsx` — Added `ReplayThumbnail` component (~110 lines), updated `SketchCard` with `isHovering` state + `playbackSpeed` prop
- `src/app/page.tsx` — Added `userSettings` query in `GalleryContent`, pass `playbackSpeed` to `SketchCard`
- `src/app/user/[handle]/page.tsx` — Same: `userSettings` query + `playbackSpeed` prop
