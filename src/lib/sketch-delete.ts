export const SKETCH_DELETE_WINDOW_MS = 5 * 60 * 1000;

export function canDeleteOwnSketch(
  createdAt?: number | null,
  now = Date.now(),
) {
  return createdAt != null && now <= createdAt + SKETCH_DELETE_WINDOW_MS;
}
