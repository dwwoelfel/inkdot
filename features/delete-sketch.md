# Delete Own Sketches

## Problem
Users can't delete their own sketches.

## Solution
- Add a delete button on the sketch replay page, visible only to the author
- Show a confirmation before deleting
- On delete, remove the sketch entity and navigate back to gallery
- Tighten sketch permissions: only the author can update/delete
- Restrict author deletes to the first 5 minutes after sketch creation
- Hide the author delete button once the 5-minute window expires

## Changes
- `src/app/sketch/[id]/page.tsx`: Add delete button + confirmation in the top bar (next to Back)
- `src/instant.perms.ts`: Lock down sketch update/delete to author only

## Follow-up
- Author deletes now use a 5-minute window in Instant permissions via `deleteWindowOpen`
- The sketch page hides the delete button once that window expires
- Admin delete behavior is unchanged
- Delete confirmation now raises a global toast if the transaction fails
