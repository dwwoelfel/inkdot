import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const DOUBLE_TAP_MS = 300;

type PointerCoords = { x: number; y: number };

function getCenter(pointers: Map<number, PointerCoords>): PointerCoords {
  const pts = Array.from(pointers.values());
  const x = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const y = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return { x, y };
}

function getDistance(pointers: Map<number, PointerCoords>): number {
  const pts = Array.from(pointers.values());
  if (pts.length < 2) return 0;
  return Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
}

export function usePinchZoom(
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const [transform, setTransform] = useState('');
  const [isZoomed, setIsZoomed] = useState(false);

  // Gesture state (like Excalidraw's gesture object)
  const pointersRef = useRef(new Map<number, PointerCoords>());
  const lastCenterRef = useRef<PointerCoords | null>(null);
  const initialDistanceRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number | null>(null);
  const isPinchingRef = useRef(false);
  // Set when pinch ends; stays true until all fingers lift to prevent
  // the remaining finger from drawing
  const wasPinchingRef = useRef(false);

  const lastTapRef = useRef(0);

  const applyTransform = useCallback(() => {
    const z = zoomRef.current;
    const p = panRef.current;
    if (z === 1 && p.x === 0 && p.y === 0) {
      setTransform('');
      setIsZoomed(false);
    } else {
      setTransform(`translate(${p.x}px, ${p.y}px) scale(${z})`);
      setIsZoomed(z > 1.05);
    }
  }, []);

  const clampPan = useCallback(
    (panX: number, panY: number, zoom: number) => {
      const container = containerRef.current;
      if (!container) return { x: panX, y: panY };
      const rect = container.getBoundingClientRect();
      return {
        x: Math.max(-(rect.width * (zoom - 1)), Math.min(0, panX)),
        y: Math.max(-(rect.height * (zoom - 1)), Math.min(0, panY)),
      };
    },
    [containerRef],
  );

  const resetZoom = useCallback(() => {
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    applyTransform();
  }, [applyTransform]);

  const removePointer = useCallback(
    (pointerId: number) => {
      pointersRef.current.delete(pointerId);
      if (pointersRef.current.size < 2) {
        // End pinch, but keep wasPinching until all fingers lift
        if (isPinchingRef.current) {
          isPinchingRef.current = false;
          wasPinchingRef.current = true;
        }
        lastCenterRef.current = null;
        initialDistanceRef.current = null;
        initialZoomRef.current = null;
      }
      if (pointersRef.current.size === 0) {
        wasPinchingRef.current = false;
        if (zoomRef.current < 1.05) {
          resetZoom();
        }
      }
    },
    [resetZoom],
  );

  // Document-level pointerup catches pointers released outside the canvas
  // (Excalidraw does this too)
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (pointersRef.current.has(e.pointerId)) {
        removePointer(e.pointerId);
      }
    };
    document.addEventListener('pointerup', handler);
    document.addEventListener('pointercancel', handler);
    return () => {
      document.removeEventListener('pointerup', handler);
      document.removeEventListener('pointercancel', handler);
    };
  }, [removePointer]);

  // Safety net: touchend with 0 remaining touches clears everything
  useEffect(() => {
    const handler = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        pointersRef.current.clear();
        isPinchingRef.current = false;
        wasPinchingRef.current = false;
        lastCenterRef.current = null;
        initialDistanceRef.current = null;
        initialZoomRef.current = null;
      }
    };
    document.addEventListener('touchend', handler);
    return () => document.removeEventListener('touchend', handler);
  }, []);

  const wrapPointerDown = useCallback(
    (
      e: React.PointerEvent<HTMLCanvasElement>,
      drawingDown: (e: React.PointerEvent<HTMLCanvasElement>) => void,
      cancelStroke: () => void,
    ) => {
      // Capture this pointer so all its events route to the canvas
      e.currentTarget.setPointerCapture(e.pointerId);

      pointersRef.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
      });

      if (pointersRef.current.size >= 2) {
        // Entering pinch mode
        if (!isPinchingRef.current) {
          cancelStroke();
          isPinchingRef.current = true;
          wasPinchingRef.current = true;
        }
        // Initialize pinch reference values
        lastCenterRef.current = getCenter(pointersRef.current);
        initialDistanceRef.current = getDistance(pointersRef.current);
        initialZoomRef.current = zoomRef.current;
        return;
      }

      // Don't draw with a leftover finger after pinch
      if (wasPinchingRef.current) return;

      // Double-tap to reset zoom
      const now = Date.now();
      if (now - lastTapRef.current < DOUBLE_TAP_MS && isZoomed) {
        lastTapRef.current = 0;
        resetZoom();
        return;
      }
      lastTapRef.current = now;

      // Single pointer — forward to drawing
      drawingDown(e);
    },
    [isZoomed, resetZoom],
  );

  const wrapPointerMove = useCallback(
    (
      e: React.PointerEvent<HTMLCanvasElement>,
      drawingMove: (e: React.PointerEvent<HTMLCanvasElement>) => void,
    ) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
      });

      if (
        pointersRef.current.size >= 2 &&
        lastCenterRef.current &&
        initialDistanceRef.current &&
        initialZoomRef.current
      ) {
        const center = getCenter(pointersRef.current);
        const distance = getDistance(pointersRef.current);

        // Zoom: relative to initial values
        const scaleFactor = distance / initialDistanceRef.current;
        const newZoom = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, initialZoomRef.current * scaleFactor),
        );
        const oldZoom = zoomRef.current;

        // Pan delta from finger movement
        const deltaX = center.x - lastCenterRef.current.x;
        const deltaY = center.y - lastCenterRef.current.y;
        lastCenterRef.current = center;

        // Compensate pan for zoom change so pinch center stays anchored.
        // Content point at screen pos cx: contentX = (cx - pan) / zoom
        // After zoom change: newPan = cx - contentX * newZoom
        //                          = cx - (cx - oldPan) * newZoom / oldZoom
        const container = containerRef.current;
        const cRect = container?.getBoundingClientRect();
        const cx = center.x - (cRect?.left ?? 0);
        const cy = center.y - (cRect?.top ?? 0);
        const zoomRatio = newZoom / oldZoom;
        const zoomPanX = cx - (cx - panRef.current.x) * zoomRatio;
        const zoomPanY = cy - (cy - panRef.current.y) * zoomRatio;

        // Add finger movement delta on top of zoom-adjusted pan
        const newPanX = zoomPanX + deltaX;
        const newPanY = zoomPanY + deltaY;
        const clamped = clampPan(newPanX, newPanY, newZoom);

        zoomRef.current = newZoom;
        panRef.current = clamped;
        applyTransform();
        return;
      }

      // Reset gesture state if conditions aren't met (lost a pointer)
      if (pointersRef.current.size >= 2) {
        lastCenterRef.current = null;
        initialDistanceRef.current = null;
        initialZoomRef.current = null;
        return;
      }

      if (wasPinchingRef.current) return;

      drawingMove(e);
    },
    [applyTransform, clampPan, containerRef],
  );

  const wrapPointerUp = useCallback(
    (
      e: React.PointerEvent<HTMLCanvasElement>,
      drawingUp: (e: React.PointerEvent<HTMLCanvasElement>) => void,
    ) => {
      const wasInPinch = isPinchingRef.current || wasPinchingRef.current;
      const wasTracked = pointersRef.current.has(e.pointerId);

      removePointer(e.pointerId);

      // Don't forward drawing events during/after pinch or for untracked pointers
      if (wasInPinch || !wasTracked) return;

      drawingUp(e);
    },
    [removePointer],
  );

  const wrapPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      removePointer(e.pointerId);
    },
    [removePointer],
  );

  return {
    transform,
    isZoomed,
    wrapPointerDown,
    wrapPointerMove,
    wrapPointerUp,
    wrapPointerCancel,
    resetZoom,
  };
}
