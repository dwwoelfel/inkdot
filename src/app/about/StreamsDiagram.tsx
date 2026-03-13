'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  C,
  EDGE_GAP,
  GROW_SPEED,
  MAX_PARTICLE_SIZE,
  NODES,
  PARTICLE_PX_SPEED,
  SVG_H,
  SVG_W,
  bezierPoint,
  edgeGeo,
  edgeKey,
  edgeLength,
} from './diagram-data';
import { STEPS } from './diagram-steps';
import { useParticles } from './useParticles';
import { CleanNode } from './CleanNode';

export function StreamsDiagram() {
  const [stepIdx, setStepIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const step = STEPS[stepIdx];

  // Manage phased edges (enterDelay / autoExit)
  const hasLifecycleEdges = step.activeEdges.some((e) => e.enterDelay);

  useEffect(() => {
    if (!hasLifecycleEdges) return;
    const thresholds = [
      ...new Set(
        step.activeEdges.flatMap((e) =>
          [e.enterDelay, e.autoExit].filter(
            (v): v is number => v != null && v > 0,
          ),
        ),
      ),
    ].sort((a, b) => a - b);

    const timers = thresholds.map((t) =>
      window.setTimeout(
        () => setElapsed((prev) => Math.max(prev, t)),
        t * 1000,
      ),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [stepIdx, hasLifecycleEdges, step.activeEdges]);

  // Filter active edges based on elapsed time
  const visibleActiveEdges = useMemo(() => {
    if (!hasLifecycleEdges) return step.activeEdges;
    return step.activeEdges.filter((e) => {
      const enter = e.enterDelay ?? 0;
      const exit = e.autoExit ?? Infinity;
      return elapsed >= enter && elapsed < exit;
    });
  }, [step.activeEdges, hasLifecycleEdges, elapsed]);

  // Grow/shrink animation for edges
  const hasEdgeAnim = step.activeEdges.some((e) => e.grow || e.shrink);
  const [growElapsed, setGrowElapsed] = useState(Infinity);
  useEffect(() => {
    if (!hasEdgeAnim) return;
    const start = performance.now();
    const animEdges = step.activeEdges.filter((e) => e.grow || e.shrink);
    const maxEnd = Math.max(
      ...animEdges.map((e) => {
        const geo = edgeGeo(e);
        const len = edgeLength(geo);
        let end = 0;
        if (e.grow) {
          end = Math.max(
            end,
            (e.enterDelay ?? 0) * 1000 + (len / GROW_SPEED) * 1000,
          );
        }
        if (e.shrink) {
          const undershootMs =
            ((EDGE_GAP + MAX_PARTICLE_SIZE) / PARTICLE_PX_SPEED) * 1000;
          end = Math.max(
            end,
            (e.shrinkDelay ?? 0) * 1000 +
              undershootMs +
              (len / PARTICLE_PX_SPEED) * 1000,
          );
        }
        return end;
      }),
    );
    let raf: number;
    const tick = () => {
      const ms = performance.now() - start;
      setGrowElapsed(ms);
      if (ms < maxEnd) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stepIdx, hasEdgeAnim, step.activeEdges]);

  const { particles, flushEdges } = useParticles(visibleActiveEdges, stepIdx);

  const activeNodeSet = new Set(step.activeNodes);
  const dimNodeSet = new Set(step.dimNodes ?? []);
  const activeEdgeSet = new Set(visibleActiveEdges.map(edgeKey));
  const allEdges = useMemo(
    () => [
      ...visibleActiveEdges.filter((e) => e.flush == null),
      ...(step.dimEdges ?? []),
    ],
    [visibleActiveEdges, step.dimEdges],
  );

  const goToStep = useCallback((idx: number) => {
    setStepIdx(idx);
    setElapsed(0);
    setGrowElapsed(0);
  }, []);
  const prev = useCallback(
    () => goToStep(Math.max(0, stepIdx - 1)),
    [goToStep, stepIdx],
  );
  const next = useCallback(
    () => goToStep(Math.min(STEPS.length - 1, stepIdx + 1)),
    [goToStep, stepIdx],
  );

  return (
    <div className="bg-surface mx-auto max-w-lg overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/[0.06]">
      {/* SVG area */}
      <div className="relative overflow-x-auto px-2 pt-3 pb-1">
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full">
          <defs>
            <filter
              id="particle-glow"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation="2"
                result="blur"
              />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <marker
              id="arrow"
              viewBox="0 0 6 6"
              refX="5"
              refY="3"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M0,0.5 L5.5,3 L0,5.5Z" fill={C.edge} />
            </marker>
            <marker
              id="arrow-dim"
              viewBox="0 0 6 6"
              refX="5"
              refY="3"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M0,0.5 L5.5,3 L0,5.5Z" fill={C.edgeDim} />
            </marker>
            <marker
              id="arrow-start"
              viewBox="0 0 6 6"
              refX="5"
              refY="3"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M0,0.5 L5.5,3 L0,5.5Z" fill={C.edge} />
            </marker>
          </defs>

          {/* Server group label */}
          <text
            x={180}
            y={10}
            textAnchor="middle"
            className="pointer-events-none text-[9px] font-semibold select-none"
            fill={C.navy}
            opacity={1}
          >
            Instant Servers
          </text>

          {/* Edges */}
          {allEdges.map((e) => {
            const key = edgeKey(e);
            const active = activeEdgeSet.has(key);
            const geo = edgeGeo(e);
            const isGrow = active && e.grow;
            const isShrink = active && e.shrink;
            const hasPathAnim = isGrow || isShrink;

            let dashOffset: number | undefined;
            if (hasPathAnim) {
              dashOffset = 0;
              if (isGrow) {
                const dur = (edgeLength(geo) / GROW_SPEED) * 1000;
                const growT = Math.min(
                  1,
                  Math.max(0, growElapsed - (e.enterDelay ?? 0) * 1000) / dur,
                );
                const growProgress = 1 - (1 - growT) * (1 - growT);
                dashOffset = 1 - growProgress;
              }
              if (isShrink) {
                const dur = (edgeLength(geo) / PARTICLE_PX_SPEED) * 1000;
                const undershootMs =
                  ((EDGE_GAP + MAX_PARTICLE_SIZE) / PARTICLE_PX_SPEED) * 1000;
                const shrinkT = Math.min(
                  1,
                  Math.max(
                    0,
                    growElapsed - (e.shrinkDelay ?? 0) * 1000 - undershootMs,
                  ) / dur,
                );
                if (shrinkT > 0) {
                  dashOffset = -shrinkT;
                }
              }
            }

            const dimEdge = active && e.dim;
            return (
              <g
                key={key}
                style={{
                  opacity: active ? (dimEdge ? 0.25 : 1) : 0.15,
                  transition: 'opacity 0.4s ease-out',
                }}
              >
                <path
                  d={geo.d}
                  fill="none"
                  stroke={active && !dimEdge ? C.edge : C.edgeDim}
                  strokeWidth={active ? 1.5 : 0.8}
                  strokeLinecap="round"
                  strokeDasharray={
                    hasPathAnim
                      ? 1
                      : active && e.stream === false
                        ? '4 2.5'
                        : undefined
                  }
                  pathLength={hasPathAnim ? 1 : undefined}
                  strokeDashoffset={hasPathAnim ? dashOffset : undefined}
                  markerEnd={!active ? 'url(#arrow-dim)' : undefined}
                />
              </g>
            );
          })}

          {/* Flush edges (grow/shrink animation) */}
          {flushEdges.map((f) => (
            <path
              key={f.key}
              d={f.geo.d}
              fill="none"
              stroke={C.edge}
              strokeWidth={1.5}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={f.dashOffset}
            />
          ))}

          {/* Particles (behind nodes so they disappear into icons) */}
          {particles.map((p, i) => {
            const pos = bezierPoint(p.geo, p.progress);
            return (
              <circle
                key={i}
                cx={pos.x}
                cy={pos.y}
                r={p.size}
                fill={
                  p.dim
                    ? C.edgeDim
                    : [
                        '#e74c3c',
                        '#3498db',
                        '#2ecc71',
                        '#f39c12',
                        '#9b59b6',
                        '#1abc9c',
                        '#e67e22',
                        '#e84393',
                      ][p.n % 8]
                }
                opacity={p.dim ? 0.3 : 0.9}
                filter={p.dim ? undefined : 'url(#particle-glow)'}
              />
            );
          })}

          {/* Nodes */}
          {NODES.map((node) => {
            const active = activeNodeSet.has(node.id);
            const dim = dimNodeSet.has(node.id);
            return (
              <g key={node.id}>
                <CleanNode node={node} filled={active} dim={dim} />
                {node.label && (
                  <text
                    x={node.cx}
                    y={
                      node.shape === 'circle' || node.shape === 'cylinder'
                        ? node.cy + 21
                        : node.cy + 1
                    }
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="pointer-events-none text-[9px] font-semibold select-none"
                    fill={dim ? C.edgeDim : active ? C.navy : 'currentColor'}
                    opacity={dim ? 0.6 : active ? 1 : 0.6}
                  >
                    {node.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Controls + description */}
      <div className="border-t border-black/[0.06] px-4 py-3 sm:px-5">
        {/* Step indicator bar */}
        <div className="mb-3 flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => goToStep(i)}
              aria-label={`Step ${i + 1}: ${s.title}`}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i === stepIdx
                  ? 'bg-accent'
                  : i < stepIdx
                    ? 'bg-accent/30'
                    : 'bg-border-strong/50'
              }`}
            />
          ))}
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="min-h-[9rem] sm:min-h-[7rem]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={stepIdx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <h3 className="text-text-primary text-sm leading-tight font-semibold">
                    {step.title}
                  </h3>
                  <p className="text-text-secondary mt-1.5 text-xs leading-relaxed sm:text-sm">
                    {step.description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 pt-3">
            <button
              onClick={prev}
              disabled={stepIdx === 0}
              aria-label="Previous step"
              className="text-text-secondary hover:bg-hover flex h-8 w-8 items-center justify-center rounded-lg transition-all active:scale-90 disabled:opacity-20"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              onClick={next}
              disabled={stepIdx === STEPS.length - 1}
              aria-label="Next step"
              className="text-text-secondary hover:bg-hover flex h-8 w-8 items-center justify-center rounded-lg transition-all active:scale-90 disabled:opacity-20"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
