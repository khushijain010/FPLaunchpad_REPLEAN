// The hero view. Goals are glowing panels, tactics are edges, proved goals turn gold and drop
// a star into the constellation along the base. Everything here is drawn from a Scene; the
// only state is animation progress, which is damped toward the scene each frame.
// Loaded lazily: none of three.js is in the first bundle.

import { Html, Line, OrbitControls, RoundedBox } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Scene, SceneEdge, SceneNode } from '../core/scene';

const COLORS = {
  open: '#ff4f00',
  active: '#ff4f00',
  worked: '#4a2a1c',
  proved: '#f4b740',
  error: '#ff4b4b',
  hyp: '#2fd3c4',
} as const;
const EMISSIVE: Readonly<Record<SceneNode['status'], number>> = { open: 0.35, active: 1.6, worked: 0.15, proved: 1.1, error: 1.4 };
const NODE = { w: 2.05, h: 0.62, d: 0.16 } as const;
const SETTLE = 1e-3;

/** The bit of drei's OrbitControls the camera rig touches. */
type Controls = { target: THREE.Vector3; update: () => void };

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Exponential approach; snaps when the user prefers reduced motion. */
const damp = (cur: number, target: number, lambda: number, dt: number, snap: boolean) =>
  snap ? target : THREE.MathUtils.damp(cur, target, lambda, dt);

function shelfPos(scene: Scene, slot: number): THREE.Vector3 {
  return new THREE.Vector3(scene.bounds.minX + slot * 0.55, scene.bounds.minY - 2.1, 0.4);
}

function NodeMesh({ n, scene, parentPos }: { n: SceneNode; scene: Scene; parentPos: THREE.Vector3 | undefined }) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const snap = useMemo(reducedMotion, []);
  const target = useMemo(() => new THREE.Vector3(n.x, n.y, n.z), [n.x, n.y, n.z]);
  const color = useMemo(() => new THREE.Color(COLORS[n.status]), [n.status]);
  const pulseAt = useRef<number | null>(null);

  // Born from the parent: start at its position so the branch visibly grows out of it.
  useEffect(() => {
    if (n.isNew && parentPos && group.current && !snap) {
      group.current.position.copy(parentPos);
      group.current.scale.setScalar(0.2);
    }
  }, [n.isNew, parentPos, snap]);
  useEffect(() => {
    if (scene.done && n.status === 'proved') pulseAt.current = performance.now();
  }, [scene.done, n.status]);

  useFrame((state, dt) => {
    const g = group.current;
    const m = mat.current;
    if (!g || !m) return;
    const t = Math.min(dt, 0.05);
    const pulse = pulseAt.current === null ? 0 : (performance.now() - pulseAt.current) / 900;
    const bump = pulse > 0 && pulse < 1 ? Math.sin(pulse * Math.PI) * 0.18 : 0;
    if (pulse >= 1) pulseAt.current = null;
    const scale = (n.status === 'proved' ? 0.82 : n.status === 'worked' ? 0.9 : 1) + bump;
    g.position.x = damp(g.position.x, target.x, 8, t, snap);
    g.position.y = damp(g.position.y, target.y, 8, t, snap);
    g.position.z = damp(g.position.z, target.z, 8, t, snap);
    const s = damp(g.scale.x, scale, 9, t, snap);
    g.scale.setScalar(s);
    m.color.lerp(color, snap ? 1 : 1 - Math.exp(-8 * t));
    m.emissive.copy(m.color);
    m.emissiveIntensity = damp(m.emissiveIntensity, EMISSIVE[n.status] + bump * 4, 6, t, snap);
    const moving =
      g.position.distanceTo(target) > SETTLE || Math.abs(s - scale) > SETTLE || pulseAt.current !== null || Math.abs(m.emissiveIntensity - EMISSIVE[n.status]) > 0.01;
    if (moving) state.invalidate();
  });

  return (
    <group ref={group} position={[n.x, n.y, n.z]}>
      <RoundedBox args={[NODE.w, NODE.h, NODE.d]} radius={0.07} smoothness={3}>
        <meshStandardMaterial ref={mat} color={COLORS[n.status]} emissive={COLORS[n.status]} emissiveIntensity={EMISSIVE[n.status]} roughness={0.45} metalness={0.1} toneMapped={false} />
      </RoundedBox>
      <Html center distanceFactor={9} zIndexRange={[20, 0]} className="t3-label-wrap" pointerEvents="none">
        <div className={`t3-label s-${n.status}`}>
          {n.tag && <span className="t3-tag">{n.tag}</span>}
          {n.label}
        </div>
      </Html>
    </group>
  );
}

function curvePoints(e: SceneEdge): THREE.Vector3[] {
  const a = new THREE.Vector3(e.from.x, e.from.y - NODE.h / 2, e.from.z);
  const b = new THREE.Vector3(e.to.x, e.to.y + NODE.h / 2, e.to.z);
  const midY = (a.y + b.y) / 2;
  return new THREE.CubicBezierCurve3(a, new THREE.Vector3(a.x, midY, a.z), new THREE.Vector3(b.x, midY, b.z), b).getPoints(28);
}

function EdgeLine({ e }: { e: SceneEdge }) {
  const points = useMemo(() => curvePoints(e), [e]);
  const spark = useRef<THREE.Mesh>(null);
  const start = useRef(performance.now());
  const snap = useMemo(reducedMotion, []);
  useEffect(() => {
    start.current = performance.now();
  }, [e.isNew, e.id]);

  useFrame((state) => {
    const m = spark.current;
    if (!m) return;
    const t = (performance.now() - start.current) / 750;
    if (!e.isNew || snap || t >= 1) {
      m.visible = false;
      return;
    }
    const i = t * (points.length - 1);
    const p = points[Math.floor(i)]!.clone().lerp(points[Math.min(points.length - 1, Math.ceil(i))]!, i % 1);
    m.position.copy(p);
    m.visible = true;
    state.invalidate();
  });

  const mid = points[Math.floor(points.length / 2)]!;
  return (
    <group>
      <Line points={points} color={e.isNew ? '#ff7a3d' : '#3a3a3a'} lineWidth={e.isNew ? 2 : 1.2} transparent opacity={0.9} />
      <mesh ref={spark} visible={false}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color="#ffd2b8" toneMapped={false} />
      </mesh>
      {e.label && (
        <Html position={[mid.x + 0.1, mid.y, mid.z]} distanceFactor={9} zIndexRange={[10, 0]} pointerEvents="none">
          <div className={`t3-edge-label${e.isNew ? ' is-new' : ''}`}>{e.label}</div>
        </Html>
      )}
    </group>
  );
}

/** Hypotheses of the active goal, floating beside it. New ones fly in; used ones get a beam. */
function HypRing({ scene }: { scene: Scene }) {
  const n = scene.active;
  if (!n || n.hyps.length === 0) return null;
  const hyps = n.hyps.slice(-6);
  return (
    <group>
      {hyps.map((h, i) => {
        const angle = -0.9 + (i / Math.max(1, hyps.length - 1)) * 1.8;
        const pos = new THREE.Vector3(n.x + NODE.w / 2 + 1.1 + Math.cos(angle) * 0.4, n.y + Math.sin(angle) * 1.1, n.z + 0.3);
        const used = scene.usedHyps.has(h.name);
        const added = scene.addedHyps.has(h.name);
        return (
          <group key={`${n.id}:${h.name}`}>
            {used && <Line points={[pos, new THREE.Vector3(n.x + NODE.w / 2, n.y, n.z)]} color={COLORS.hyp} lineWidth={1.4} transparent opacity={0.8} />}
            <Html position={pos} center distanceFactor={9} zIndexRange={[30, 0]} pointerEvents="none">
              <div className={`t3-hyp${added ? ' is-added' : ''}${used ? ' is-used' : ''}`}>
                <b>{h.name}</b> : {h.type}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function Star({ scene, id, slot, isNew, from }: { scene: Scene; id: string; slot: number; isNew: boolean; from: THREE.Vector3 | undefined }) {
  const mesh = useRef<THREE.Mesh>(null);
  const target = useMemo(() => shelfPos(scene, slot), [scene, slot]);
  const snap = useMemo(reducedMotion, []);
  useEffect(() => {
    if (isNew && from && mesh.current && !snap) mesh.current.position.copy(from);
  }, [isNew, from, snap, id]);
  useFrame((state, dt) => {
    const m = mesh.current;
    if (!m) return;
    m.position.lerp(target, snap ? 1 : 1 - Math.exp(-4 * Math.min(dt, 0.05)));
    m.rotation.y += dt * 0.6;
    if (m.position.distanceTo(target) > SETTLE) state.invalidate();
  });
  return (
    <mesh ref={mesh} position={target}>
      <icosahedronGeometry args={[0.17, 0]} />
      <meshStandardMaterial color={COLORS.proved} emissive={COLORS.proved} emissiveIntensity={1.4} toneMapped={false} />
    </mesh>
  );
}

/** Frames the active goal when it changes; pulls back over the whole proof on Q.E.D. */
function CameraRig({ scene, resetKey }: { scene: Scene; resetKey: number }) {
  const controls = useThree((s) => s.controls) as unknown as Controls | null;
  const camera = useThree((s) => s.camera);
  const until = useRef(0);
  const goal = useRef({ target: new THREE.Vector3(), position: new THREE.Vector3(0, 0, 11) });
  const snap = useMemo(reducedMotion, []);
  const focusKey = scene.done ? 'qed' : (scene.active?.id ?? 'none');

  useEffect(() => {
    const { minX, maxX, minY, maxY } = scene.bounds;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2 - 0.8;
    if (scene.done || !scene.active) {
      const span = Math.max(maxX - minX + 4, (maxY - minY + 4) * 1.4, 6);
      goal.current.target.set(cx, cy, 0);
      goal.current.position.set(cx, cy + 0.6, span * 1.05 + 2);
    } else {
      const a = scene.active;
      goal.current.target.set(a.x * 0.7 + cx * 0.3, a.y * 0.7 + cy * 0.3, a.z);
      goal.current.position.set(a.x * 0.7 + cx * 0.3, a.y * 0.7 + cy * 0.3 + 0.6, a.z + 10);
    }
    until.current = performance.now() + 1200;
    // Recompute only when the focus changes or the user asks for a reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, resetKey]);

  useFrame((state, dt) => {
    if (!controls || performance.now() > until.current) return;
    const k = snap ? 1 : 1 - Math.exp(-3.5 * Math.min(dt, 0.05));
    controls.target.lerp(goal.current.target, k);
    camera.position.lerp(goal.current.position, k);
    controls.update();
    state.invalidate();
  });
  return null;
}

function Contents({ scene, resetKey }: { scene: Scene; resetKey: number }) {
  const positions = useMemo(() => new Map(scene.nodes.map((n) => [n.id, new THREE.Vector3(n.x, n.y, n.z)] as const)), [scene.nodes]);
  const parentOf = useMemo(() => new Map(scene.edges.map((e) => [e.to.id, e.from.id] as const)), [scene.edges]);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [scene, invalidate]);

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 8]} intensity={1.1} />
      {scene.edges.map((e) => (
        <EdgeLine key={e.id} e={e} />
      ))}
      {scene.nodes.map((n) => {
        const p = parentOf.get(n.id);
        return <NodeMesh key={n.id} n={n} scene={scene} parentPos={p ? positions.get(p) : undefined} />;
      })}
      <HypRing scene={scene} />
      {scene.proved.map((s) => (
        <Star key={s.id} scene={scene} id={s.id} slot={s.slot} isNew={s.isNew} from={positions.get(s.id)} />
      ))}
      <CameraRig scene={scene} resetKey={resetKey} />
      <OrbitControls makeDefault enableDamping={false} minDistance={3} maxDistance={40} />
      <EffectComposer>
        <Bloom mipmapBlur luminanceThreshold={0.55} luminanceSmoothing={0.2} intensity={0.75} />
      </EffectComposer>
    </>
  );
}

export default function Tree3D({ scene }: { scene: Scene }) {
  const [resetKey, setResetKey] = useState(0);
  return (
    <div className="tree3d" onDoubleClick={() => setResetKey((k) => k + 1)} title="Drag to orbit, scroll to zoom, double-click to reset">
      <Canvas frameloop="demand" dpr={[1, 2]} camera={{ position: [0, 0.6, 11], fov: 42 }} gl={{ antialias: true, powerPreference: 'high-performance' }} aria-label="3D goal tree">
        <color attach="background" args={['#0a0a0a']} />
        <Contents scene={scene} resetKey={resetKey} />
      </Canvas>
      <div className={`t3-qed${scene.done ? ' is-on' : ''}`} aria-hidden={!scene.done}>
        Q.E.D.
      </div>
    </div>
  );
}
