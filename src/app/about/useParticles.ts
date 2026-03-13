import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type EdgeDef,
  type EdgeGeo,
  type FlushEdgeRender,
  type Particle,
  BASE_PARTICLE_SIZE,
  EDGE_GAP,
  GROW_SPEED,
  MAX_PARTICLE_SIZE,
  PARTICLE_PX_SPEED,
  SPAWN_INTERVAL,
  edgeGeo,
  edgeKey,
  edgeLength,
} from './diagram-data';

type FlushPhase = 'idle' | 'growing' | 'streaming' | 'draining' | 'shrinking';

type FlushState = {
  phase: FlushPhase;
  phaseStart: number;
  simEdge: SimEdge;
  growDuration: number;
  threshold: number;
};

type SimEdge = {
  key: string;
  from: string;
  to: string;
  geo: EdgeGeo;
  undershoot: number;
  overshoot: number;
  progressPerSec: number;
  isSource: boolean;
  dim: boolean;
  sendOffsetNode?: string;
};

type LiveParticle = {
  edgeKey: string;
  geo: EdgeGeo;
  progress: number;
  progressPerSec: number;
  size: number;
  n: number;
  to: string;
  overshoot: number;
  count: number;
};

const sizeVar = [0, 0.5, -0.4, 0.9, -0.2, 0.7, 0.1, -0.3, 1.0, 0.3];

function buildSimEdge(e: EdgeDef): SimEdge {
  const geo = edgeGeo(e);
  const len = edgeLength(geo);
  return {
    key: edgeKey(e),
    from: e.from,
    to: e.to,
    geo,
    undershoot: (EDGE_GAP + MAX_PARTICLE_SIZE) / len,
    overshoot: 1 + (EDGE_GAP + MAX_PARTICLE_SIZE) / len,
    progressPerSec: PARTICLE_PX_SPEED / len,
    isSource: e.from === 'writer' || e.from === 'storage',
    dim: e.dim ?? false,
    sendOffsetNode: e.sendOffsetNode,
  };
}

export function useParticles(edges: EdgeDef[], stepIdx: number) {
  const [renderState, setRenderState] = useState<{
    particles: Particle[];
    flushEdges: FlushEdgeRender[];
  }>({ particles: [], flushEdges: [] });
  const animRef = useRef(0);

  const globalTimeRef = useRef(0);
  const nodeArrivedRef = useRef(new Map<string, number>());
  const edgeSentRef = useRef(new Map<string, number>());
  const liveRef = useRef<LiveParticle[]>([]);
  const flushRef = useRef<FlushState | null>(null);

  useEffect(() => {
    if (stepIdx === 0) {
      globalTimeRef.current = 0;
      nodeArrivedRef.current.clear();
      edgeSentRef.current.clear();
      liveRef.current = [];
    }
    flushRef.current = null;
  }, [stepIdx]);

  const streamEdges = useMemo(
    () => edges.filter((e) => e.stream !== false && e.flush == null),
    [edges],
  );

  const flushEdgeDefs = useMemo(
    () => edges.filter((e) => e.flush != null),
    [edges],
  );

  useEffect(() => {
    if (flushEdgeDefs.length === 0) {
      flushRef.current = null;
      return;
    }
    const e = flushEdgeDefs[0];
    const se = buildSimEdge(e);
    flushRef.current = {
      phase: 'growing',
      phaseStart: globalTimeRef.current,
      simEdge: { ...se, isSource: false, dim: false },
      growDuration: edgeLength(edgeGeo(e)) / GROW_SPEED,
      threshold: e.flush!,
    };
  }, [flushEdgeDefs]);

  const simEdges = useMemo(() => streamEdges.map(buildSimEdge), [streamEdges]);

  const simEdgesRef = useRef(simEdges);
  useEffect(() => {
    simEdgesRef.current = simEdges;
  }, [simEdges]);

  useEffect(() => {
    let lastT = 0;

    const tick = (t: number) => {
      if (!lastT) {
        lastT = t;
        animRef.current = requestAnimationFrame(tick);
        return;
      }
      const dt = Math.min((t - lastT) / 1000, SPAWN_INTERVAL);
      lastT = t;
      globalTimeRef.current += dt;

      const info = simEdgesRef.current;
      const nodeArrived = nodeArrivedRef.current;
      const edgeSent = edgeSentRef.current;
      const live = liveRef.current;

      const getAvailable = (nodeId: string) => {
        if (nodeId === 'writer') {
          return Math.floor(globalTimeRef.current / SPAWN_INTERVAL);
        }
        // In step 6 (Replay), S3 always has data to serve
        if (nodeId === 'storage' && stepIdx === 5) {
          return Math.max(nodeArrived.get(nodeId) ?? 0, 10);
        }
        return nodeArrived.get(nodeId) ?? 0;
      };

      // Advance live particles
      for (let i = live.length - 1; i >= 0; i--) {
        const p = live[i];
        p.progress += dt * p.progressPerSec;
        if (p.progress >= p.overshoot) {
          const prev = nodeArrived.get(p.to) ?? 0;
          nodeArrived.set(p.to, prev + p.count);
          live.splice(i, 1);
        }
      }

      // --- Flush state machine ---
      const flush = flushRef.current;
      let flushActiveEdge: SimEdge | null = null;
      if (flush) {
        const elapsed = globalTimeRef.current - flush.phaseStart;
        switch (flush.phase) {
          case 'idle': {
            const available = getAvailable(flush.simEdge.from);
            const sent = edgeSent.get(flush.simEdge.key) ?? 0;
            if (available - sent >= flush.threshold) {
              flush.phase = 'growing';
              flush.phaseStart = globalTimeRef.current;
            }
            break;
          }
          case 'growing': {
            if (elapsed >= flush.growDuration) {
              flush.phase = 'streaming';
              flush.phaseStart = globalTimeRef.current;
              flushActiveEdge = flush.simEdge;
            }
            break;
          }
          case 'streaming': {
            flushActiveEdge = flush.simEdge;
            break;
          }
          case 'draining': {
            const hasFlushParticles = live.some(
              (p) => p.edgeKey === flush.simEdge.key,
            );
            if (!hasFlushParticles) {
              flush.phase = 'shrinking';
              flush.phaseStart = globalTimeRef.current;
            }
            break;
          }
          case 'shrinking': {
            if (elapsed >= flush.growDuration) {
              flush.phase = 'idle';
              flush.phaseStart = globalTimeRef.current;
            }
            break;
          }
        }
      }

      // Spawn particles
      const spawnEdges = flushActiveEdge ? [...info, flushActiveEdge] : info;
      let changed = true;
      let iterations = 0;
      while (changed && iterations < 5) {
        changed = false;
        iterations++;
        for (const se of spawnEdges) {
          const available = getAvailable(se.from);
          let sent = edgeSent.get(se.key);
          if (sent == null) {
            sent = se.sendOffsetNode
              ? (nodeArrived.get(se.sendOffsetNode) ?? 0)
              : 0;
            edgeSent.set(se.key, sent);
          }
          if (available <= sent) continue;

          const batch = available - sent;

          if (batch > 8) {
            const weight = Math.min(batch, 10);
            live.push({
              edgeKey: se.key,
              geo: se.geo,
              progress: -se.undershoot,
              progressPerSec: se.progressPerSec,
              size: BASE_PARTICLE_SIZE * 1.8,
              n: sent,
              to: se.to,
              overshoot: se.overshoot,
              count: weight,
            });
            edgeSent.set(se.key, sent + weight);
          } else {
            const toSpawn = Math.min(batch, 2);
            for (let i = 0; i < toSpawn; i++) {
              const n = sent + i;
              live.push({
                edgeKey: se.key,
                geo: se.geo,
                progress: -se.undershoot - i * 0.2,
                progressPerSec: se.progressPerSec,
                size: BASE_PARTICLE_SIZE + sizeVar[n % sizeVar.length],
                n,
                to: se.to,
                overshoot: se.overshoot,
                count: 1,
              });
            }
            edgeSent.set(se.key, sent + toSpawn);
          }
          changed = true;
        }
      }

      // Post-spawn: streaming → draining
      if (flush && flush.phase === 'streaming') {
        const available = getAvailable(flush.simEdge.from);
        const sent = edgeSent.get(flush.simEdge.key) ?? 0;
        if (sent >= available) {
          flush.phase = 'draining';
          flush.phaseStart = globalTimeRef.current;
        }
      }

      // Build dim lookup
      const dimByKey = new Map<string, boolean>();
      for (const se of info) {
        dimByKey.set(se.key, se.dim);
      }

      // Compute flush edge render state
      const flushEdges: FlushEdgeRender[] = [];
      if (flush) {
        const fElapsed = globalTimeRef.current - flush.phaseStart;
        const fT = Math.min(1, fElapsed / flush.growDuration);
        switch (flush.phase) {
          case 'growing': {
            const eased = 1 - (1 - fT) * (1 - fT);
            flushEdges.push({
              key: flush.simEdge.key,
              geo: flush.simEdge.geo,
              dashOffset: 1 - eased,
            });
            break;
          }
          case 'streaming':
          case 'draining': {
            flushEdges.push({
              key: flush.simEdge.key,
              geo: flush.simEdge.geo,
              dashOffset: 0,
            });
            break;
          }
          case 'shrinking': {
            const eased = 1 - fT * fT;
            flushEdges.push({
              key: flush.simEdge.key,
              geo: flush.simEdge.geo,
              dashOffset: eased - 1,
            });
            break;
          }
        }
      }

      setRenderState({
        particles: live.map((p) => ({
          geo: p.geo,
          progress: p.progress,
          size: p.size,
          n: p.n,
          dim: dimByKey.get(p.edgeKey),
        })),
        flushEdges,
      });

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [stepIdx]);

  return renderState;
}
