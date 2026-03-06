# OG Images & Description

## What it does
Adds Open Graph and Twitter Card metadata to the site for better link previews when sharing on social media.

### Site-wide
- Updated description: "Every brushstroke is streamed in real-time and replays as a timelapse. Draw, share, and remix sketches on inkdot."
- Static OG image generated via `next/og` `ImageResponse` — shows "inkdot" logo dot + text with tagline on a dark stone gradient background

### Per-sketch
- Dynamic OG image shows the sketch thumbnail centered on a dark background with inkdot branding and author handle
- Falls back to the site-wide branded style if no thumbnail exists
- Metadata sets title like "Sketch by @handle | InkDot" with a description inviting viewers to watch the timelapse

## Implementation
- `src/app/layout.tsx` — updated `metadata` export with `openGraph` and `twitter` fields
- `src/app/opengraph-image.tsx` — static site-wide OG image (edge runtime, `ImageResponse`)
- `src/app/twitter-image.tsx` — re-exports from opengraph-image
- `src/app/sketch/[id]/opengraph-image.tsx` — dynamic per-sketch OG image using admin SDK to fetch thumbnail
- `src/app/sketch/[id]/twitter-image.tsx` — re-exports from the sketch opengraph-image
- `src/app/sketch/[id]/layout.tsx` — `generateMetadata` fetches sketch author handle for title/description

## Notes
- All OG image routes use `runtime = 'edge'`
- Admin SDK is initialized inline in each server file (same pattern as `src/app/api/admin/review/route.ts`)
- Next.js automatically resolves `opengraph-image.tsx` files in the same directory as the page for `og:image` tags
