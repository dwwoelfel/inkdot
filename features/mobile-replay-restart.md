# Mobile Replay Restart

## What it does
Lets a second long-press on a sketch card restart replay playback on mobile instead of leaving the current replay position unchanged.

## Implementation
- Inspect the mobile long-press behavior in `SketchCard`
- Detect when replay is already active on a completed sketch
- Force the replay thumbnail to restart when a second long-press fires

## Changes after implementation
- Added a replay restart key to `SketchCard`
- On mobile, a long-press on an already replaying completed sketch increments that key instead of only re-setting hover state
- `ReplayThumbnail` now remounts on repeated long-presses, which restarts playback from the beginning
