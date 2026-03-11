'use client';

import { SketchCard } from './components';
import { useEffect, useLayoutEffect, useRef } from 'react';

type TopSketch = Parameters<typeof SketchCard>[0]['sketch'];

export function AnimatedTopSketchGrid({
  sketches,
  isAdmin,
  playbackSpeed,
  showCursor,
}: {
  sketches: TopSketch[];
  isAdmin: boolean;
  playbackSpeed: number;
  showCursor: boolean;
}) {
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const previousPositionsRef = useRef(new Map<string, DOMRect>());
  const rafRef = useRef<number | null>(null);
  const hasMeasuredRef = useRef(false);

  useLayoutEffect(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const nextPositions = new Map<string, DOMRect>();
    for (const sketch of sketches) {
      const node = itemRefs.current.get(sketch.id);
      if (!node) continue;
      nextPositions.set(sketch.id, node.getBoundingClientRect());
    }

    if (!hasMeasuredRef.current) {
      previousPositionsRef.current = nextPositions;
      hasMeasuredRef.current = true;
      return;
    }

    for (const sketch of sketches) {
      const node = itemRefs.current.get(sketch.id);
      const previous = previousPositionsRef.current.get(sketch.id);
      const next = nextPositions.get(sketch.id);
      if (!node || !previous || !next) continue;

      const dx = previous.left - next.left;
      const dy = previous.top - next.top;
      if (dx === 0 && dy === 0) continue;

      node.style.transition = 'transform 0s';
      node.style.transform = `translate(${dx}px, ${dy}px)`;
      node.style.willChange = 'transform';
      node.getBoundingClientRect();
    }

    rafRef.current = requestAnimationFrame(() => {
      for (const sketch of sketches) {
        const node = itemRefs.current.get(sketch.id);
        if (!node) continue;

        node.style.transition = 'transform 200ms ease';
        node.style.transform = 'translate(0, 0)';
      }
    });

    previousPositionsRef.current = nextPositions;

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [sketches]);

  useEffect(() => {
    const nodes = [...itemRefs.current.values()];
    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName !== 'transform') return;
      const node = event.currentTarget as HTMLDivElement;
      node.style.transition = '';
      node.style.willChange = '';
    };

    for (const node of nodes) {
      node.addEventListener('transitionend', handleTransitionEnd);
    }

    return () => {
      for (const node of nodes) {
        node.removeEventListener('transitionend', handleTransitionEnd);
      }
    };
  }, [sketches]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
      {sketches.map((sketch) => (
        <div
          key={sketch.id}
          ref={(node) => {
            if (node) {
              itemRefs.current.set(sketch.id, node);
            } else {
              itemRefs.current.delete(sketch.id);
            }
          }}
        >
          <SketchCard
            sketch={sketch}
            isAdmin={isAdmin}
            playbackSpeed={playbackSpeed}
            showCursor={showCursor}
          />
        </div>
      ))}
    </div>
  );
}
