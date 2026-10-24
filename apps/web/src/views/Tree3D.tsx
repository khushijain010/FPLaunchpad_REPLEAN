// The hero view. Goals are glowing panels, tactics are edges, proved goals turn gold and drop
// a star into the constellation along the base. Everything here is drawn from a Scene; the
// only state is animation progress, which is damped toward the scene each frame.
// Loaded lazily: none of three.js is in the first bundle.

import { Grid, Html, Line, OrbitControls, RoundedBox } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Scene, SceneEdge, SceneNode } from '../core/scene';
import { useTheme, type Theme } from '../ui/theme';

/** Every color the scene uses, per theme. Nodes are outlined panels: a colored rim around a plain face. */
type Palette = Readonly<{
  rim: Readonly<Record<SceneNode['status'], string>>;
  glow: Readonly<Record<SceneNode['status'], number>>;
  face: string;
  faceActive: string;
  background: string;
  edge: string;
  edgeNew: string;
  spark: string;
  hyp: string;
  proved: string;
  gridCell: string;
  gridSection: string;
  bloom: boolean;
}>;

const PALETTES: Readonly<Record<Theme, Palette>> = {
  dark: {
    rim: { open: '#ff4f00', active: '#ff6a1a', worked: '#5b4c45', proved: '#f4b740', error: '#ff4b4b' },
    glow: { open: 0.5, active: 1.7, worked: 0.1, proved: 1.2, error: 1.4 },
    face: '#141417',
    faceActive: '#22120a',
    background: '#0f0f12',
    edge: '#3d3d44',
    edgeNew: '#ff7a3d',
    spark: '#ffd2b8',
    hyp: '#2fd3c4',
    proved: '#f4b740',
    gridCell: '#1c1c22',
    gridSection: '#2b2b33',
    bloom: true,
  },
  light: {
    rim: { open: '#e8510c', active: '#e8510c', worked: '#b9aea7', proved: '#c98a06', error: '#d23131' },
    glow: { open: 0.15, active: 0.35, worked: 0, proved: 0.25, error: 0.3 },
    face: '#ffffff',
    faceActive: '#fff1e8',
    background: '#ffffff',
    edge: '#cdc6bd',
    edgeNew: '#e8510c',
    spark: '#e8510c',
    hyp: '#0f8f86',
    proved: '#c98a06',
    gridCell: '#efebe5',
    gridSection: '#e2ddd5',
    bloom: false,
  },
};

const PaletteContext = createContext<Palette>(PALETTES.dark);
const usePalette = () => useContext(PaletteContext);

/**
 * drei sizes <Html> by camera distance only, not by canvas size, so in a small panel labels
 * would outgrow their nodes. Scaling with the canvas height keeps label and node in proportion.
 */
const LabelScaleContext = createContext(9);
const useLabelScale = () => useContext(LabelScaleContext);
const NODE = { w: 2.3, h: 0.86, d: 0.16 } as const;
/** Label size relative to the canvas height (see LabelScaleContext). */
const LABEL_SCALE = 0.018;
/** Width of one label character in world units at that scale (13px JetBrains Mono ≈ 7.8px). */
const CHAR_W = 7.8 * LABEL_SCALE;
/** Each node is as wide as its label needs, within limits: short goals get compact panels. */
const nodeWidth = (label: string) => Math.min(2.6, Math.max(1.15, label.length * CHAR_W + 0.55));
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
  const pal = usePalette();
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const snap = useMemo(reducedMotion, []);
  const target = useMemo(() => new THREE.Vector3(n.x, n.y, n.z), [n.x, n.y, n.z]);
  const color = useMemo(() => new THREE.Color(pal.rim[n.status]), [pal, n.status]);
  const glow = pal.glow[n.status];
  const labelScale = useLabelScale();
  const w = nodeWidth(n.label);
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
    m.emissiveIntensity = damp(m.emissiveIntensity, glow + bump * 4, 6, t, snap);
    const moving =
      g.position.distanceTo(target) > SETTLE || Math.abs(s - scale) > SETTLE || pulseAt.current !== null || Math.abs(m.emissiveIntensity - glow) > 0.01;
    if (moving) state.invalidate();
  });

  return (
    <group ref={group} position={[n.x, n.y, n.z]}>
      {/* The rim: a colored panel, just visible around the face in front of it. */}
      <RoundedBox args={[w, NODE.h, NODE.d]} radius={0.09} smoothness={3}>
        <meshStandardMaterial ref={mat} color={pal.rim[n.status]} emissive={pal.rim[n.status]} emissiveIntensity={glow} roughness={0.45} metalness={0.1} toneMapped={false} />
      </RoundedBox>
      <RoundedBox args={[w - 0.06, NODE.h - 0.06, NODE.d]} radius={0.075} smoothness={3} position={[0, 0, 0.014]}>
        <meshBasicMaterial color={n.status === 'active' ? pal.faceActive : pal.face} toneMapped={false} />
      </RoundedBox>
      <Html center distanceFactor={labelScale} zIndexRange={[20, 0]} className="t3-label-wrap" pointerEvents="none">
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
  const pal = usePalette();
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

  // Near the parent, where branches haven't spread yet, so labels don't sit on the children.
  const mid = points[Math.floor(points.length * 0.15)]!;
  const labelScale = useLabelScale();
  return (
    <group>
      <Line points={points} color={e.isNew ? pal.edgeNew : pal.edge} lineWidth={e.isNew ? 2 : 1.4} transparent opacity={0.95} />
      <mesh ref={spark} visible={false}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color={pal.spark} toneMapped={false} />
      </mesh>
      {e.label && (
        <Html position={[mid.x + 0.12, mid.y, mid.z]} distanceFactor={labelScale} zIndexRange={[10, 0]} pointerEvents="none">
          <div className={`t3-edge-label${e.isNew ? ' is-new' : ''}`}>{e.label}</div>
        </Html>
      )}
    </group>
  );
}

/**
 * Hypotheses of the active goal, stacked under it. The active goal is always a leaf, so the
 * space below it is free. New ones fly in; the ones the line used get a beam to the goal.
 */
function HypRing({ scene }: { scene: Scene }) {
  const pal = usePalette();
  const labelScale = useLabelScale();
  const n = scene.active;
  if (!n || n.hyps.length === 0) return null;
  const hyps = n.hyps.slice(-6);
  return (
    <group>
      {hyps.map((h, i) => {
        const pos = new THREE.Vector3(n.x, n.y - NODE.h / 2 - 0.4 - i * 0.4, n.z + 0.2);
        const used = scene.usedHyps.has(h.name);
        const added = scene.addedHyps.has(h.name);
        return (
          <group key={`${n.id}:${h.id}`}>
            {used && <Line points={[pos.clone().setX(pos.x - 0.9), new THREE.Vector3(n.x - nodeWidth(n.label) / 2 + 0.1, n.y, n.z)]} color={pal.hyp} lineWidth={1.4} transparent opacity={0.8} />}
            <Html position={pos} center distanceFactor={labelScale} zIndexRange={[30, 0]} pointerEvents="none">
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
  const pal = usePalette();
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
      <meshStandardMaterial color={pal.proved} emissive={pal.proved} emissiveIntensity={pal.bloom ? 1.4 : 0.3} toneMapped={false} />
    </mesh>
  );
}

/** Frames the active goal when it changes; pulls back over the whole proof on Q.E.D. */
function CameraRig({ scene, resetKey }: { scene: Scene; resetKey: number }) {
  const controls = useThree((s) => s.controls) as unknown as Controls | null;
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const until = useRef(0);
  const goal = useRef({ target: new THREE.Vector3(), position: new THREE.Vector3(0, 0, 11) });
  const snap = useMemo(reducedMotion, []);
  const focusKey = scene.done ? 'qed' : (scene.active?.id ?? 'none');

  useEffect(() => {
    const { minX, maxX, minY, maxY } = scene.bounds;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2 - 0.8;
    const aspect = size.width / Math.max(1, size.height);
    const tanHalf = Math.tan(((camera as THREE.PerspectiveCamera).fov * Math.PI) / 360);
    // Distance at which a w-by-h region fills the view, whichever of the two is tighter.
    const fit = (w: number, h: number) => Math.max(h, w / aspect) / (2 * tanHalf);
    const treeW = maxX - minX + NODE.w;
    if (scene.done || !scene.active) {
      const d = Math.min(40, fit(treeW + 1.6, maxY - minY + 5.2));
      goal.current.target.set(cx, cy, 0);
      goal.current.position.set(cx, cy + 0.4, d);
    } else {
      const a = scene.active;
      // If the whole tree fits across, center it; otherwise lean toward the active goal.
      const wantW = Math.min(treeW + 1.2, 11);
      const tx = treeW + 1.2 <= 11 ? cx : a.x * 0.6 + cx * 0.4;
      const ty = a.y * 0.6 + cy * 0.4;
      const d = Math.min(30, Math.max(5, fit(wantW, Math.min(maxY - minY + 2.8, 8.5))));
      goal.current.target.set(tx, ty, a.z);
      goal.current.position.set(tx, ty + 0.4, a.z + d);
    }
    until.current = performance.now() + 1200;
    // Recompute when the focus changes, the panel is resized, or the user asks for a reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, resetKey, size.width, size.height]);

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
  const pal = usePalette();
  const height = useThree((s) => s.size.height);
  const { minX, maxX, minY } = scene.bounds;
  const positions = useMemo(() => new Map(scene.nodes.map((n) => [n.id, new THREE.Vector3(n.x, n.y, n.z)] as const)), [scene.nodes]);
  const parentOf = useMemo(() => new Map(scene.edges.map((e) => [e.to.id, e.from.id] as const)), [scene.edges]);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [scene, invalidate]);

  return (
    <LabelScaleContext.Provider value={LABEL_SCALE * height}>
      <ambientLight intensity={pal.bloom ? 0.35 : 0.9} />
      <directionalLight position={[4, 6, 8]} intensity={pal.bloom ? 1.1 : 0.8} />
      {/* A floor under the tree, fading into the distance. */}
      <Grid
        position={[(minX + maxX) / 2, minY - 2.6, -3]}
        args={[60, 60]}
        cellSize={0.6}
        sectionSize={3}
        cellColor={pal.gridCell}
        sectionColor={pal.gridSection}
        cellThickness={0.6}
        sectionThickness={1}
        fadeDistance={26}
        fadeStrength={1.6}
        infiniteGrid
      />
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
      {pal.bloom && (
        <EffectComposer>
          <Bloom mipmapBlur luminanceThreshold={0.55} luminanceSmoothing={0.2} intensity={0.7} />
        </EffectComposer>
      )}
    </LabelScaleContext.Provider>
  );
}

export default function Tree3D({ scene }: { scene: Scene }) {
  const theme = useTheme((s) => s.theme);
  const pal = PALETTES[theme];
  const [resetKey, setResetKey] = useState(0);
  // drei's <Html> picks its DOM parent on first render. Before the canvas is attached there is
  // none, and labels mounted then never appear. So the scene waits for onCreated.
  const [ready, setReady] = useState(false);
  return (
    <div className="tree3d" onDoubleClick={() => setResetKey((k) => k + 1)} title="Drag to orbit, scroll to zoom, double-click to reset">
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: [0, 0.6, 11], fov: 42 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        aria-label="3D goal tree"
        onCreated={() => setReady(true)}
      >
        <color attach="background" args={[pal.background]} />
        <PaletteContext.Provider value={pal}>{ready && <Contents scene={scene} resetKey={resetKey} />}</PaletteContext.Provider>
      </Canvas>
      <div className={`t3-qed${scene.done ? ' is-on' : ''}`} aria-hidden={!scene.done}>
        Q.E.D.
      </div>
    </div>
  );
}
