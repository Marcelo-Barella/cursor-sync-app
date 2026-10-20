# File Solar System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Subagents run on Grok 4.7 High (user rule).

**Goal:** Replace the encryption-focused orbit visuals with one plain-language solar system of ten Cursor setup items: clickable on the landing hero, continuing by scroll into How it syncs (rockets copy items to a cloud station and machine 02), and spinning on the auth pages with a success expansion and a recovery-key warning.

**Architecture:** Pure, DOM-free math lives in `lib/syncedFiles.ts`, `lib/syncStoryTimeline.ts`, and `scenes/fileOrbitLayout.ts` and is unit-tested in Vitest (Node environment). One shared Three.js module, `scenes/fileSystemOrbits.ts`, builds the ten orbiting items. Thin scenes (`landingJourneyScene.ts`, `authOrbitScene.ts`) compose it with `glowPlanet.ts`, `syncRockets.ts`, and `syncStoryProps.ts`. React reads and writes plain state objects by reference, and GSAP drives them (one pinned ScrollTrigger timeline on the landing page, `Flip` on auth).

**Tech Stack:** React 19, Vite 6, TypeScript 5.8 strict, three 0.186, gsap 3.15 (`ScrollTrigger`, `ScrollToPlugin`, `Flip`), Vitest 3 (`environment: "node"`, `src/**/*.test.ts`).

**Spec:** `docs/superpowers/specs/2026-10-07-file-solar-system-design.md`

## Global Constraints

- Scope: `apps/web` only. No API, schema, or extension change.
- No new dependencies. `ScrollToPlugin` and `Flip` come from the installed `gsap` 3.15.0 (`gsap/ScrollToPlugin`, `gsap/Flip`).
- Scene contract (`.cursor/rules/threejs-scenes.mdc`): plain TS in `apps/web/src/scenes/`; `create<Name>Scene(host, state, ...)` returns `{ state, dispose, ... }` or `null`; mount only with `useLazyScene`; loaders are a module-level const or `useCallback` with `[]`; push every geometry, material, and texture into `stage.disposables`; never dispose `Sprite` geometry.
- `three` stays out of the main chunk: React and `lib/` files import scene modules with `import type` only. The only runtime import of a scene is the loader's dynamic `import()`.
- GSAP scroll work sits in `gsap.context()` and is reverted in cleanup. No `@gsap/react`.
- Reduced motion: orbits frozen, focus cuts, autoplay never starts by itself, step clicks jump, no auth expansion.
- WebGL off: each canvas host keeps a CSS gradient for `[data-webgl="off"]`.
- Per stop (one task = one stop): at most 200 added production lines (CSS counts), at most 6 files, at most 2 new production files. Every new file is at most 300 lines. Existing files change through edits, never a whole-file write.
- No code comments. No emojis. No `any`, no blind casts; narrow `unknown`.
- No commit or push without explicit user permission. Each task ends with a checkpoint report instead of a commit.
- Copy is verbatim from the spec:
  - Hero title `Your Cursor setup, in orbit.`; sub line `Settings, rules, and skills follow you to every computer.`
  - Steps: `01 Install / Add Cursor Sync to Cursor. Your setup is the little world of files around your computer.`; `02 Secret word / Pick a passphrase. Only you know it, and every copy is locked with it.`; `03 Copy up / Cursor Sync sends copies to a safe spot in the cloud. Your originals stay right where they are.`; `04 Copy down / Your other computer uses the same passphrase to get the copies. Now both match.`
  - Note `Nothing moves. Everything is copied. Only your passphrase opens the copies.`
  - Auth success: `You're connected.`; `Your recovery key appears once, in the Cursor Sync extension, right after you continue.`; `Save it somewhere safe, like a password manager. This is the only time it is shown. If you lose it, you'll need to restart syncing, and some files may be missing afterwards.`; button `Continue in Cursor`.

## Verify commands

- Unit tests: `npm test -w @cursor-sync/web` (whole web suite, about 1 s; baseline today: 6 files, 42 tests pass).
- Single test file: `npm test -w @cursor-sync/web -- src/scenes/fileOrbitLayout.test.ts`
- Typecheck and build: `npm run build -w @cursor-sync/web` (must exit 0).
- Naming and order gate (any task that creates a file): `node /home/marcelo/.cursor/skills/code-architecture/scripts/quality-gate.mjs` from the repo root (must exit 0).
- Dev server: `npm run dev:web`, then open `http://localhost:3000`.
- Local API for the auth success path: `docker compose up --build` (API on `http://localhost:8100`) with `VITE_API_URL=http://localhost:8100` in `.env`.

## Spec deviations (decided here, report them to the user)

1. Fourteen stops instead of about four. The per-stop hard limit (200 lines, 2 new production files) does not fit four stops.
2. Extra modules split by job: `scenes/fileOrbitLayout.ts` (pure seeded lanes, placement, label clearance; testable without DOM), `scenes/glowPlanet.ts` (planet builder shared by the journey and auth scenes; replaces `createPlanet` in the deleted `planetOrbitScene.ts`), `lib/syncStoryTimeline.ts` (step copy, timeline labels, rocket leg progress, autoplay reducer), `lib/useHeroFileFocus.ts`, `lib/useStoryAutoplay.ts`.
3. `createLandingJourneyScene(host, state, onItemClick)` takes a third parameter: the raycast click callback.
4. `AuthLayout` takes `connectedPanel?: ReactNode` instead of a boolean `connected`. Its presence is the flag; `AuthForm` owns the content and the `Continue in Cursor` navigation.
5. Orbit items take forward from the analytic lane tangent (exact on a circular lane) instead of a finite difference. The rule is updated in Task 14.
6. Autoplay: generic user input (`wheel`, `touchstart`, `keydown`, `pointerdown`) during `waiting` keeps `waiting` (the scroll only restarts the 2 s quiet timer); it stops only `playing`. A literal "any input moves to stopped" means a wheel user can never reach autoplay, because the wheel that enters the story already stops it. A step click is an explicit manual choice and stops autoplay from `waiting` or `playing` (`step-selected` event). Input on the play/pause button is not counted as user input.
7. Focus previous/next moves the camera target from the old item to the new one with a `focusSwitch` blend (no full release), so the camera does not jump.

## File structure

| File | Status | Job | Task |
| --- | --- | --- | --- |
| `apps/web/src/lib/syncedFiles.ts` | new | Ten orbit items: id, label, kind, what it is, how it helps. | 1 |
| `apps/web/src/scenes/fileOrbitLayout.ts` | new | Seeded lanes, item placement and tangent, label clearance push. Pure `three` math. | 1 |
| `apps/web/src/scenes/fileOrbitLayout.test.ts` | new test | Seed determinism, lane spread, clearance. | 1 |
| `apps/web/src/scenes/fileSystemOrbits.ts` | new | Item meshes (document or folder), labels, hit spheres, lane rings, hover, dim, focus, presence, pulse. | 2, 9 |
| `apps/web/src/scenes/glowPlanet.ts` | new | Bergamot or obsidian planet with rim, halo, glow sprite; recolorable halo. | 3 |
| `apps/web/src/scenes/landingJourneyScene.ts` | new | Hero plus story: machine 01, picking, focus camera, station, machine 02, key, lock ring, rockets, story camera. | 3, 4, 5, 9 |
| `apps/web/src/lib/useHeroFileFocus.ts` | new | Focus open, switch, close, Esc, scroll release, focus return, card follow. | 4, 5 |
| `apps/web/src/components/FileFocusCard.tsx` | new | Side card: name, what it is, how it helps you, close, previous, next. | 5 |
| `apps/web/src/pages/LandingPage.tsx` / `.css` | edit | Journey stage, hero copy, keyboard file list, card, pinned timeline, story overlay. | 3, 4, 5, 6, 10, 11 |
| `apps/web/src/lib/syncStoryTimeline.ts` | new | Step copy, labels, journey segment lengths, leg progress, autoplay reducer. | 7 |
| `apps/web/src/lib/syncStoryTimeline.test.ts` | new test | Step mapping, leg progress, autoplay transitions. | 7 |
| `apps/web/src/scenes/syncRockets.ts` | new | Ten rockets, Bezier legs, orientation, exhaust, trails, labels. | 8 |
| `apps/web/src/scenes/syncStoryProps.ts` | edit | Adds `createCloudStation`; old relay removed in Task 14. | 9, 14 |
| `apps/web/src/components/HowItSyncsSection.tsx` / `.css` | edit | Story overlay: title, clickable steps, rail, play/pause, note. | 10, 11 |
| `apps/web/src/lib/useStoryAutoplay.ts` | new | Autoplay timers and input listeners around `nextAutoplayStatus`. | 11 |
| `apps/web/src/scenes/authOrbitScene.ts` | new | Obsidian planet with shared orbits, `expand` state. | 12 |
| `apps/web/src/components/AuthLayout.tsx` / `.css` | edit | Auth scene swap, terminal removed, `Flip` expansion, success panel slot. | 12, 13 |
| `apps/web/src/pages/AuthForm.tsx` | edit | Connected view after `saveToken`; `Continue in Cursor`. | 13 |
| `apps/web/src/scenes/planetOrbitScene.ts` | delete | Removed after the last import is gone. | 14 |
| `apps/web/src/scenes/orbitFileLabel.ts` | edit | `sealed` tone removed. | 14 |
| `.cursor/rules/threejs-scenes.mdc` | edit | Rule bullets for the new modules. | 14 |

Before each task: re-read every file the task touches (the tree may have moved). After each task: report outcome, files, proof (command plus exit code), and unverified risk, then stop. The user says continue.

---

### Task 1: Synced files data and seeded orbit layout

Budget: about 185 production lines, 2 new production files, 1 new test file.

**Files:**
- Create: `apps/web/src/lib/syncedFiles.ts`
- Create: `apps/web/src/scenes/fileOrbitLayout.ts`
- Test: `apps/web/src/scenes/fileOrbitLayout.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type SyncedFileKind = "file" | "folder"`; `type SyncedFile = { id: string; label: string; kind: SyncedFileKind; whatItIs: string; howItHelps: string }`; `const SYNCED_FILES: readonly SyncedFile[]` (10 entries, ids `settings, keybindings, rules, skills, mcp, extensions, snippets, agents, hooks, commands`).
  - `type OrbitLane = { tilt: THREE.Quaternion; radius: number; direction: 1 | -1; meanMotion: number }`; `type OrbitSlot = { laneIndex: number; phase: number }`; `type FileOrbitLayout = { lanes: readonly OrbitLane[]; slots: readonly OrbitSlot[] }`.
  - `const ORBIT_PLANET_RADIUS = 1`; `const LABEL_CLEARANCE_RADIUS = 1.85`.
  - `createFileOrbitLayout(itemCount: number, seed: number): FileOrbitLayout`
  - `placeOrbitItem(layout: FileOrbitLayout, itemIndex: number, orbitClock: number, position: THREE.Vector3, tangent: THREE.Vector3): void` (planet-local frame, planet center at origin).
  - `placeOrbitLabel(label: THREE.Object3D, itemPosition: THREE.Vector3, binormal: THREE.Vector3, viewPoint: THREE.Vector3): void` (`viewPoint` is the camera in the same planet-local frame).

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/scenes/fileOrbitLayout.test.ts`:

```ts
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { LABEL_CLEARANCE_RADIUS, createFileOrbitLayout, placeOrbitItem, placeOrbitLabel } from "./fileOrbitLayout";

function itemPositionAt(seed: number, itemIndex: number, orbitClock: number): number[] {
  const position = new THREE.Vector3();
  placeOrbitItem(createFileOrbitLayout(10, seed), itemIndex, orbitClock, position, new THREE.Vector3());
  return position.toArray();
}

describe("file orbit layout", () => {
  it("places every item at the same point for the same seed", () => {
    for (let itemIndex = 0; itemIndex < 10; itemIndex += 1) {
      expect(itemPositionAt(7, itemIndex, 3.2)).toEqual(itemPositionAt(7, itemIndex, 3.2));
    }
  });

  it("changes the layout when the seed changes", () => {
    expect(itemPositionAt(7, 0, 0)).not.toEqual(itemPositionAt(8, 0, 0));
  });

  it("spreads ten items over four lanes that turn both ways", () => {
    const layout = createFileOrbitLayout(10, 7);
    expect(layout.lanes).toHaveLength(4);
    expect(new Set(layout.slots.map((slot) => slot.laneIndex)).size).toBe(4);
    expect(new Set(layout.lanes.map((lane) => lane.direction))).toEqual(new Set([1, -1]));
  });

  it("keeps every item outside the planet plus label clearance at all times", () => {
    const layout = createFileOrbitLayout(10, 20261007);
    const position = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    for (let orbitClock = 0; orbitClock < 60; orbitClock += 0.5) {
      for (let itemIndex = 0; itemIndex < 10; itemIndex += 1) {
        placeOrbitItem(layout, itemIndex, orbitClock, position, tangent);
        expect(position.length()).toBeGreaterThanOrEqual(LABEL_CLEARANCE_RADIUS);
        expect(Math.abs(tangent.dot(position))).toBeLessThan(1e-9);
      }
    }
  });

  it("pushes a label off the planet disk when its item crosses in front of the planet", () => {
    const label = new THREE.Object3D();
    const itemPosition = new THREE.Vector3(0.3, 0, 1.9);
    placeOrbitLabel(label, itemPosition, new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 10));
    const labelDiskDistance = Math.hypot(label.position.x, label.position.y);
    expect(labelDiskDistance).toBeGreaterThan(Math.hypot(itemPosition.x, itemPosition.y) + 0.3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @cursor-sync/web -- src/scenes/fileOrbitLayout.test.ts`
Expected: FAIL, `Failed to resolve import "./fileOrbitLayout"`.

- [ ] **Step 3: Create the data module**

Create `apps/web/src/lib/syncedFiles.ts`:

```ts
export type SyncedFileKind = "file" | "folder";

export type SyncedFile = {
  id: string;
  label: string;
  kind: SyncedFileKind;
  whatItIs: string;
  howItHelps: string;
};

export const SYNCED_FILES: readonly SyncedFile[] = [
  {
    id: "settings",
    label: "settings.json",
    kind: "file",
    whatItIs: "Your editor preferences: theme, font, tab size.",
    howItHelps: "Every computer looks and feels the same.",
  },
  {
    id: "keybindings",
    label: "keybindings.json",
    kind: "file",
    whatItIs: "Your keyboard shortcuts.",
    howItHelps: "Your hands do not relearn anything.",
  },
  {
    id: "rules",
    label: "rules/",
    kind: "folder",
    whatItIs: "Instructions that tell the AI how you like to work.",
    howItHelps: "The AI follows your style on every computer.",
  },
  {
    id: "skills",
    label: "skills/",
    kind: "folder",
    whatItIs: "Step-by-step playbooks the AI agent can use.",
    howItHelps: "Your agent knows the same tricks everywhere.",
  },
  {
    id: "mcp",
    label: "mcp.json",
    kind: "file",
    whatItIs: "The list of outside tools your AI can use.",
    howItHelps: "You set them up once; every computer has them.",
  },
  {
    id: "extensions",
    label: "extensions",
    kind: "file",
    whatItIs: "The list of extensions you have installed.",
    howItHelps: "A new computer gets the same add-ons.",
  },
  {
    id: "snippets",
    label: "snippets/",
    kind: "folder",
    whatItIs: "Short code templates you type often.",
    howItHelps: "Your shortcuts for common code come with you.",
  },
  {
    id: "agents",
    label: "AGENTS.md",
    kind: "file",
    whatItIs: "Project notes the AI reads before it starts.",
    howItHelps: "The AI gets the same briefing on every computer.",
  },
  {
    id: "hooks",
    label: "hooks.json",
    kind: "file",
    whatItIs: "Small automatic actions around the AI's work.",
    howItHelps: "Your safety checks run everywhere.",
  },
  {
    id: "commands",
    label: "commands/",
    kind: "folder",
    whatItIs: "Your custom slash commands.",
    howItHelps: "Your own commands work on every computer.",
  },
];
```

- [ ] **Step 4: Create the orbit layout module**

Create `apps/web/src/scenes/fileOrbitLayout.ts`:

```ts
import * as THREE from "three";

export type OrbitLane = {
  tilt: THREE.Quaternion;
  radius: number;
  direction: 1 | -1;
  meanMotion: number;
};

export type OrbitSlot = {
  laneIndex: number;
  phase: number;
};

export type FileOrbitLayout = {
  lanes: readonly OrbitLane[];
  slots: readonly OrbitSlot[];
};

export const ORBIT_PLANET_RADIUS = 1;
export const LABEL_CLEARANCE_RADIUS = 1.85;

const LANE_RADII = [1.98, 2.32, 2.66, 3] as const;
const LANE_PLANE_NORMAL = new THREE.Vector3(0, 0, 1);
const laneNormal = new THREE.Vector3();
const labelView = new THREE.Vector3();
const labelOutward = new THREE.Vector3();

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function createFileOrbitLayout(itemCount: number, seed: number): FileOrbitLayout {
  const random = createSeededRandom(seed);
  const lanes = LANE_RADII.map((laneRadius, laneIndex): OrbitLane => {
    const azimuth = random() * Math.PI * 2;
    const inclination = THREE.MathUtils.lerp(0.22, 0.62, random());
    laneNormal.set(
      Math.sin(inclination) * Math.cos(azimuth),
      Math.cos(inclination),
      Math.sin(inclination) * Math.sin(azimuth),
    );
    return {
      tilt: new THREE.Quaternion().setFromUnitVectors(LANE_PLANE_NORMAL, laneNormal),
      radius: laneRadius + THREE.MathUtils.lerp(-0.08, 0.08, random()),
      direction: laneIndex % 2 === 0 ? 1 : -1,
      meanMotion: THREE.MathUtils.lerp(0.16, 0.34, random()),
    };
  });
  const slots = Array.from({ length: itemCount }, (_, itemIndex): OrbitSlot => {
    const laneIndex = itemIndex % lanes.length;
    const laneShare = Math.ceil((itemCount - laneIndex) / lanes.length);
    const laneOrder = Math.floor(itemIndex / lanes.length);
    return { laneIndex, phase: (laneOrder / laneShare) * Math.PI * 2 + random() * 0.6 };
  });
  return { lanes, slots };
}

export function placeOrbitItem(
  layout: FileOrbitLayout,
  itemIndex: number,
  orbitClock: number,
  position: THREE.Vector3,
  tangent: THREE.Vector3,
): void {
  const slot = layout.slots[itemIndex];
  const lane = layout.lanes[slot.laneIndex];
  const angle = slot.phase + lane.direction * lane.meanMotion * orbitClock;
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);
  position.set(cosAngle * lane.radius, sinAngle * lane.radius, 0).applyQuaternion(lane.tilt);
  tangent.set(-sinAngle * lane.direction, cosAngle * lane.direction, 0).applyQuaternion(lane.tilt);
}

export function placeOrbitLabel(
  label: THREE.Object3D,
  itemPosition: THREE.Vector3,
  binormal: THREE.Vector3,
  viewPoint: THREE.Vector3,
): void {
  const facing = binormal.dot(labelView.copy(viewPoint).sub(itemPosition)) >= 0 ? 1 : -1;
  labelView.copy(viewPoint);
  if (labelView.lengthSq() < 1e-6) labelView.set(0, 0, 1);
  labelView.normalize();
  labelOutward.copy(itemPosition).addScaledVector(labelView, -itemPosition.dot(labelView));
  const clearance = labelOutward.length();
  if (clearance > 1e-4) labelOutward.multiplyScalar(1 / clearance);
  else labelOutward.set(0, 1, 0);
  const overlap = THREE.MathUtils.clamp((LABEL_CLEARANCE_RADIUS - clearance) / ORBIT_PLANET_RADIUS, 0, 1);
  label.position.copy(itemPosition).addScaledVector(binormal, 0.36 * facing).addScaledVector(labelOutward, 0.55 * overlap);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -w @cursor-sync/web -- src/scenes/fileOrbitLayout.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Run the scoped suite, build, and gate**

Run: `npm test -w @cursor-sync/web && npm run build -w @cursor-sync/web && node /home/marcelo/.cursor/skills/code-architecture/scripts/quality-gate.mjs`
Expected: 7 test files pass (47 tests), build exit 0, gate exit 0.

- [ ] **Step 7: Checkpoint (no commit)**

Report the files, the three exit codes, and that nothing imports the new modules yet (Task 2 consumes them).

---

### Task 2: Shared file orbits module

Budget: about 175 production lines, 1 new production file.

**Files:**
- Create: `apps/web/src/scenes/fileSystemOrbits.ts`

**Interfaces:**
- Consumes: `SyncedFile` (Task 1); `createFileOrbitLayout`, `placeOrbitItem`, `placeOrbitLabel`, `OrbitLane` (Task 1); `createFileLabelSprite` from `orbitFileLabel.ts`; `Disposable` from `sceneStage.ts`.
- Produces:
  - `type FileSystemOrbits = { group: THREE.Group; pickables: readonly THREE.Object3D[]; update: (deltaSeconds: number, motionScale: number, cameraWorld: THREE.Vector3) => void; setHovered: (itemId: string | null) => void; setFocus: (itemId: string | null, focus: number) => void; itemWorldPosition: (itemId: string, target: THREE.Vector3) => THREE.Vector3 | null }`
  - `createFileSystemOrbits(syncedFiles: readonly SyncedFile[], seed: number, disposables: Disposable[]): FileSystemOrbits`
  - Each pickable hit sphere carries `userData.itemId: string`.

No unit test: the module only builds meshes and calls the tested math in `fileOrbitLayout.ts`. It is verified by the build here and visually in Task 3.

- [ ] **Step 1: Create the module**

Create `apps/web/src/scenes/fileSystemOrbits.ts`:

```ts
import * as THREE from "three";
import type { SyncedFile } from "../lib/syncedFiles";
import { createFileOrbitLayout, placeOrbitItem, placeOrbitLabel, type OrbitLane } from "./fileOrbitLayout";
import { createFileLabelSprite } from "./orbitFileLabel";
import type { Disposable } from "./sceneStage";

export type FileSystemOrbits = {
  group: THREE.Group;
  pickables: readonly THREE.Object3D[];
  update: (deltaSeconds: number, motionScale: number, cameraWorld: THREE.Vector3) => void;
  setHovered: (itemId: string | null) => void;
  setFocus: (itemId: string | null, focus: number) => void;
  itemWorldPosition: (itemId: string, target: THREE.Vector3) => THREE.Vector3 | null;
};

type OrbitItem = {
  id: string;
  body: THREE.Group;
  material: THREE.MeshStandardMaterial;
  label: THREE.Sprite;
  hitSphere: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  roll: number;
};

type OrbitItemParts = {
  document: THREE.BoxGeometry;
  folderBody: THREE.BoxGeometry;
  folderTab: THREE.BoxGeometry;
  hitSphere: THREE.SphereGeometry;
  hitMaterial: THREE.MeshBasicMaterial;
};

type LaneRing = THREE.LineLoop<THREE.BufferGeometry, THREE.LineDashedMaterial>;

const REST_GLOW = 0.9;
const HOVER_GLOW = 1.7;
const DIMMED_OPACITY = 0.3;
const RING_OPACITY = 0.32;
const ROLL_SPEED = 0.6;
const LOCAL_X = new THREE.Vector3(1, 0, 0);
const RING_AXIS = new THREE.Vector3(0, 0, 1);
const ringSpin = new THREE.Quaternion();
const itemPosition = new THREE.Vector3();
const itemTangent = new THREE.Vector3();
const radialUp = new THREE.Vector3();
const itemBinormal = new THREE.Vector3();
const correctedUp = new THREE.Vector3();
const itemBasis = new THREE.Matrix4();
const itemTarget = new THREE.Quaternion();
const itemRoll = new THREE.Quaternion();
const localCamera = new THREE.Vector3();

function alignOrbitItem(
  itemBody: THREE.Object3D,
  forward: THREE.Vector3,
  up: THREE.Vector3,
  roll: number,
  deltaSeconds: number,
  binormal: THREE.Vector3,
): void {
  binormal.crossVectors(forward, up);
  if (binormal.lengthSq() < 1e-6) binormal.set(0, 0, 1);
  binormal.normalize();
  correctedUp.crossVectors(binormal, forward).normalize();
  itemTarget.setFromRotationMatrix(itemBasis.makeBasis(forward, correctedUp, binormal));
  itemTarget.multiply(itemRoll.setFromAxisAngle(LOCAL_X, roll));
  itemBody.quaternion.slerp(itemTarget, 1 - Math.exp(-7 * deltaSeconds));
  itemBody.quaternion.normalize();
}

function createOrbitItemParts(disposables: Disposable[]): OrbitItemParts {
  const parts: OrbitItemParts = {
    document: new THREE.BoxGeometry(0.15, 0.2, 0.025),
    folderBody: new THREE.BoxGeometry(0.22, 0.15, 0.03),
    folderTab: new THREE.BoxGeometry(0.09, 0.035, 0.03),
    hitSphere: new THREE.SphereGeometry(0.24, 12, 8),
    hitMaterial: new THREE.MeshBasicMaterial({ visible: false }),
  };
  disposables.push(parts.document, parts.folderBody, parts.folderTab, parts.hitSphere, parts.hitMaterial);
  return parts;
}

function createOrbitItem(
  syncedFile: SyncedFile,
  itemIndex: number,
  parts: OrbitItemParts,
  disposables: Disposable[],
): OrbitItem {
  const material = new THREE.MeshStandardMaterial({
    color: syncedFile.kind === "folder" ? "#ffd7af" : "#ffa366",
    emissive: "#e87a2e",
    emissiveIntensity: REST_GLOW,
    metalness: 0.2,
    roughness: 0.4,
    transparent: true,
  });
  disposables.push(material);
  const body = new THREE.Group();
  if (syncedFile.kind === "folder") {
    const folderTab = new THREE.Mesh(parts.folderTab, material);
    folderTab.position.set(-0.06, 0.09, 0);
    body.add(new THREE.Mesh(parts.folderBody, material), folderTab);
  } else {
    body.add(new THREE.Mesh(parts.document, material));
  }
  const hitSphere = new THREE.Mesh(parts.hitSphere, parts.hitMaterial);
  hitSphere.userData.itemId = syncedFile.id;
  return {
    id: syncedFile.id,
    body,
    material,
    label: createFileLabelSprite(syncedFile.label, "plain", 0.2, disposables),
    hitSphere,
    roll: itemIndex * 1.3,
  };
}

function createLaneRing(lane: OrbitLane, disposables: Disposable[]): LaneRing {
  const ringGeometry = new THREE.BufferGeometry().setFromPoints(
    new THREE.EllipseCurve(0, 0, lane.radius, lane.radius).getPoints(160),
  );
  const ringMaterial = new THREE.LineDashedMaterial({
    color: "#e87a2e",
    dashSize: 0.07,
    gapSize: 0.06,
    transparent: true,
    opacity: RING_OPACITY,
    depthWrite: false,
  });
  disposables.push(ringGeometry, ringMaterial);
  const ring = new THREE.LineLoop(ringGeometry, ringMaterial);
  ring.computeLineDistances();
  return ring;
}

export function createFileSystemOrbits(
  syncedFiles: readonly SyncedFile[],
  seed: number,
  disposables: Disposable[],
): FileSystemOrbits {
  const layout = createFileOrbitLayout(syncedFiles.length, seed);
  const parts = createOrbitItemParts(disposables);
  const rings = layout.lanes.map((lane) => createLaneRing(lane, disposables));
  const orbitItems = syncedFiles.map((syncedFile, itemIndex) =>
    createOrbitItem(syncedFile, itemIndex, parts, disposables),
  );
  const group = new THREE.Group();
  group.add(...rings);
  orbitItems.forEach((orbitItem) => group.add(orbitItem.body, orbitItem.label, orbitItem.hitSphere));
  let orbitClock = 0;
  let hoveredId: string | null = null;
  let focusedId: string | null = null;
  let focusAmount = 0;

  return {
    group,
    pickables: orbitItems.map((orbitItem) => orbitItem.hitSphere),
    update: (deltaSeconds, motionScale, cameraWorld) => {
      orbitClock += deltaSeconds * motionScale;
      group.updateWorldMatrix(true, false);
      group.worldToLocal(localCamera.copy(cameraWorld));
      const dimAmount = focusedId ? focusAmount * (1 - DIMMED_OPACITY) : 0;
      rings.forEach((ring, laneIndex) => {
        const lane = layout.lanes[laneIndex];
        ringSpin.setFromAxisAngle(RING_AXIS, lane.direction * lane.meanMotion * orbitClock);
        ring.quaternion.copy(lane.tilt).multiply(ringSpin);
        ring.material.opacity = RING_OPACITY * (1 - dimAmount);
      });
      orbitItems.forEach((orbitItem, itemIndex) => {
        placeOrbitItem(layout, itemIndex, orbitClock, itemPosition, itemTangent);
        radialUp.copy(itemPosition).normalize();
        orbitItem.roll += deltaSeconds * ROLL_SPEED * motionScale;
        alignOrbitItem(orbitItem.body, itemTangent, radialUp, orbitItem.roll, deltaSeconds, itemBinormal);
        orbitItem.body.position.copy(itemPosition);
        orbitItem.hitSphere.position.copy(itemPosition);
        placeOrbitLabel(orbitItem.label, itemPosition, itemBinormal, localCamera);
        const emphasized = orbitItem.id === hoveredId || orbitItem.id === focusedId;
        const opacity = orbitItem.id === focusedId ? 1 : 1 - dimAmount;
        orbitItem.material.opacity = opacity;
        orbitItem.material.emissiveIntensity = emphasized ? HOVER_GLOW : REST_GLOW;
        orbitItem.label.material.opacity = opacity;
      });
    },
    setHovered: (itemId) => {
      hoveredId = itemId;
    },
    setFocus: (itemId, focus) => {
      focusedId = itemId;
      focusAmount = focus;
    },
    itemWorldPosition: (itemId, target) => {
      const orbitItem = orbitItems.find((candidate) => candidate.id === itemId);
      return orbitItem ? orbitItem.body.getWorldPosition(target) : null;
    },
  };
}
```

- [ ] **Step 2: Build and gate**

Run: `npm run build -w @cursor-sync/web && node /home/marcelo/.cursor/skills/code-architecture/scripts/quality-gate.mjs`
Expected: both exit 0.

- [ ] **Step 3: Checkpoint (no commit)**

Report the file, the exit codes, and the gap: no visual check until Task 3 mounts the module.

---

### Task 3: Glow planet and the hero journey scene

Budget: about 170 production lines, 2 new production files, 1 edited file.

**Files:**
- Create: `apps/web/src/scenes/glowPlanet.ts`
- Create: `apps/web/src/scenes/landingJourneyScene.ts`
- Modify: `apps/web/src/pages/LandingPage.tsx` (loader and intro effect only; the layout changes in Task 6)

**Interfaces:**
- Consumes: `createFileSystemOrbits` (Task 2), `SYNCED_FILES` (Task 1), `ORBIT_PLANET_RADIUS` (Task 1), `celestialBodies.ts` helpers, `createSceneStage`, `loadLabelFont`.
- Produces:
  - `type PlanetTheme = "bergamot" | "obsidian"`; `type GlowPlanet = { group: THREE.Group; haloColor: THREE.Color; update: (elapsedSeconds: number, motionScale: number, haloBoost: number) => void }`; `createGlowPlanet(theme: PlanetTheme, disposables: Disposable[]): GlowPlanet`. Mutating `haloColor` recolors the halo and the glow sprite.
  - `type JourneyState = { intro: number }` (grows in Tasks 4 and 9); `type LandingJourneyScene = { state: JourneyState; dispose: () => void }`; `createLandingJourneyScene(host: HTMLElement, state: JourneyState): Promise<LandingJourneyScene | null>`.

- [ ] **Step 1: Create the planet builder**

Create `apps/web/src/scenes/glowPlanet.ts`:

```ts
import * as THREE from "three";
import {
  BERGAMOT_PLANET_PALETTE,
  OBSIDIAN_PLANET_PALETTE,
  attachBandAdvection,
  createGlowMaterial,
  createPlanetSurfaceTexture,
  createSoftDotTexture,
  type PlanetPalette,
} from "./celestialBodies";
import { ORBIT_PLANET_RADIUS } from "./fileOrbitLayout";
import type { Disposable } from "./sceneStage";

export type PlanetTheme = "bergamot" | "obsidian";

export type GlowPlanet = {
  group: THREE.Group;
  haloColor: THREE.Color;
  update: (elapsedSeconds: number, motionScale: number, haloBoost: number) => void;
};

type PlanetStyle = {
  palette: PlanetPalette;
  seed: number;
  halo: string;
  rim: string;
  emissive: number;
  glowOpacity: number;
};

const PLANET_STYLES: Record<PlanetTheme, PlanetStyle> = {
  bergamot: { palette: BERGAMOT_PLANET_PALETTE, seed: 3.1, halo: "#e87a2e", rim: "#ffd7af", emissive: 0.22, glowOpacity: 0.45 },
  obsidian: { palette: OBSIDIAN_PLANET_PALETTE, seed: 7.3, halo: "#06b6d4", rim: "#64dcff", emissive: 0.06, glowOpacity: 0.16 },
};
const HALO_STRENGTH = 0.75;

export function createGlowPlanet(theme: PlanetTheme, disposables: Disposable[]): GlowPlanet {
  const planetStyle = PLANET_STYLES[theme];
  const surfaceTexture = createPlanetSurfaceTexture(planetStyle.palette, planetStyle.seed);
  const surfaceGeometry = new THREE.SphereGeometry(ORBIT_PLANET_RADIUS, 96, 96);
  const surfaceMaterial = new THREE.MeshStandardMaterial({
    map: surfaceTexture,
    emissive: "#ffffff",
    emissiveMap: surfaceTexture,
    emissiveIntensity: planetStyle.emissive,
    roughness: 0.85,
  });
  const bandTime = attachBandAdvection(surfaceMaterial);
  const haloColor = new THREE.Color(planetStyle.halo);
  const rimMaterial = createGlowMaterial("rim", planetStyle.rim, 0.85);
  const haloMaterial = createGlowMaterial("halo", haloColor, HALO_STRENGTH);
  haloMaterial.uniforms.glowColor.value = haloColor;
  const glowTexture = createSoftDotTexture();
  const glowMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: haloColor,
    transparent: true,
    opacity: planetStyle.glowOpacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  disposables.push(surfaceTexture, surfaceGeometry, surfaceMaterial, rimMaterial, haloMaterial, glowTexture, glowMaterial);

  const rim = new THREE.Mesh(surfaceGeometry, rimMaterial);
  rim.scale.setScalar(1.004);
  const halo = new THREE.Mesh(surfaceGeometry, haloMaterial);
  halo.scale.setScalar(1.24);
  const body = new THREE.Group();
  body.rotation.z = 0.42;
  body.add(new THREE.Mesh(surfaceGeometry, surfaceMaterial), rim, halo);
  const glow = new THREE.Sprite(glowMaterial);
  glow.scale.setScalar(5.4);
  glow.position.z = -0.6;
  const group = new THREE.Group();
  group.add(glow, body);

  return {
    group,
    haloColor,
    update: (elapsedSeconds, motionScale, haloBoost) => {
      bandTime.value = elapsedSeconds * motionScale;
      const haloWave = 1 - 0.08 * motionScale * (0.5 + 0.5 * Math.sin(elapsedSeconds * 0.7));
      haloMaterial.uniforms.glowIntensity.value = HALO_STRENGTH * haloWave * haloBoost;
      glowMaterial.color.copy(haloColor);
    },
  };
}
```

- [ ] **Step 2: Create the hero journey scene**

Create `apps/web/src/scenes/landingJourneyScene.ts`:

```ts
import * as THREE from "three";
import gsap from "gsap";
import { SYNCED_FILES } from "../lib/syncedFiles";
import { createStarField } from "./celestialBodies";
import { createFileSystemOrbits } from "./fileSystemOrbits";
import { createGlowPlanet } from "./glowPlanet";
import { loadLabelFont } from "./orbitFileLabel";
import { createSceneStage } from "./sceneStage";

export type JourneyState = {
  intro: number;
};

export type LandingJourneyScene = {
  state: JourneyState;
  dispose: () => void;
};

type CameraShot = { position: THREE.Vector3; look: THREE.Vector3 };

const ORBIT_SEED = 20261007;
const HERO_SHOT: CameraShot = { position: new THREE.Vector3(0, 1.4, 10.5), look: new THREE.Vector3(0, 0.9, 0) };
const HERO_SHOT_ASPECT = 0.95;
const easeOutCubic = gsap.parseEase("power3.out");

function createShot(): CameraShot {
  return { position: new THREE.Vector3(), look: new THREE.Vector3() };
}

function fitShot(shot: CameraShot, shotAspect: number, viewAspect: number, target: CameraShot): CameraShot {
  const narrowFit = Math.max(1, shotAspect / viewAspect);
  target.look.copy(shot.look);
  target.position.copy(shot.position).sub(shot.look).multiplyScalar(narrowFit).add(shot.look);
  return target;
}

export async function createLandingJourneyScene(
  host: HTMLElement,
  state: JourneyState,
): Promise<LandingJourneyScene | null> {
  await loadLabelFont();
  const stage = createSceneStage(host, 38);
  if (!stage) return null;
  const { scene, camera, disposables, prefersReducedMotion } = stage;

  scene.add(new THREE.AmbientLight("#ffffff", 0.35));
  const keyLight = new THREE.DirectionalLight("#fff1e0", 2.6);
  keyLight.position.set(-4, 3, 5);
  const rimLight = new THREE.DirectionalLight("#e87a2e", 3);
  rimLight.position.set(4, 1, -4);
  scene.add(keyLight, rimLight, createStarField(disposables, 1100, 30, 70));

  const machineOne = new THREE.Group();
  const machineOnePlanet = createGlowPlanet("bergamot", disposables);
  const machineOneOrbits = createFileSystemOrbits(SYNCED_FILES, ORBIT_SEED, disposables);
  machineOne.add(machineOnePlanet.group, machineOneOrbits.group);
  scene.add(machineOne);
  const heroShot = createShot();

  stage.start((deltaSeconds, elapsedSeconds) => {
    const motionScale = prefersReducedMotion ? 0 : 1;
    const intro = easeOutCubic(state.intro);
    machineOne.scale.setScalar(0.6 + 0.4 * intro);
    machineOnePlanet.update(elapsedSeconds, motionScale, intro);
    machineOneOrbits.update(deltaSeconds, motionScale, camera.position);
    fitShot(HERO_SHOT, HERO_SHOT_ASPECT, stage.aspect(), heroShot);
    camera.position.copy(heroShot.position);
    camera.lookAt(heroShot.look);
  });

  return { state, dispose: stage.dispose };
}
```

- [ ] **Step 3: Swap the hero loader in `LandingPage.tsx`**

Replace the import line:

```tsx
import type { PlanetOrbitScene } from "../scenes/planetOrbitScene";
```

with:

```tsx
import type { LandingJourneyScene } from "../scenes/landingJourneyScene";
```

Replace the `HERO_ORBIT_FILES` constant and the `loadHeroOrbit` loader with:

```tsx
const loadHeroJourney: SceneLoader<LandingJourneyScene> = (host) =>
  import("../scenes/landingJourneyScene").then(({ createLandingJourneyScene }) =>
    createLandingJourneyScene(host, { intro: 0 }),
  );
```

Replace:

```tsx
  const heroOrbitRef = useRef<HTMLDivElement>(null);
  const heroOrbit = useLazyScene(heroOrbitRef, loadHeroOrbit);
```

with:

```tsx
  const journeyHostRef = useRef<HTMLDivElement>(null);
  const journeyScene = useLazyScene(journeyHostRef, loadHeroJourney);
```

Replace the whole `useEffect` that starts with `if (!heroOrbit) return;` with:

```tsx
  useEffect(() => {
    if (!journeyScene) return;
    const journeyState = journeyScene.state;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      journeyState.intro = 1;
      return;
    }
    const introTween = gsap.to(journeyState, { intro: 1, duration: 2.4, ease: "expo.out", delay: 0.15 });
    return () => {
      introTween.kill();
    };
  }, [journeyScene]);
```

Replace `<div ref={heroOrbitRef} className="hero-orbit" aria-hidden="true" />` with `<div ref={journeyHostRef} className="hero-orbit" aria-hidden="true" />`.

- [ ] **Step 4: Build and gate**

Run: `npm run build -w @cursor-sync/web && node /home/marcelo/.cursor/skills/code-architecture/scripts/quality-gate.mjs`
Expected: both exit 0. `rg -n "planetOrbitScene" apps/web/src/pages/LandingPage.tsx` returns no hits.

- [ ] **Step 5: Visual check (driven path)**

Run `npm run dev:web`. Open `http://localhost:3000`. Take one screenshot of the hero.
Expected: the bergamot planet sits inside the old `.hero-orbit` box with ten labelled items (`settings.json` through `commands/`) on four tilted dashed lanes, items moving both ways, labels not covering the planet disk. Layout around it is still the old two-column hero (Task 6 changes it). With DevTools "Emulate CSS prefers-reduced-motion: reduce", items do not move.

- [ ] **Step 6: Checkpoint (no commit)**

Report files, exit codes, and the screenshot.

---

### Task 4: Hero picking and focus fly-to

Budget: about 175 production lines, 1 new production file, 2 edited files.

**Files:**
- Modify: `apps/web/src/scenes/landingJourneyScene.ts`
- Create: `apps/web/src/lib/useHeroFileFocus.ts`
- Modify: `apps/web/src/pages/LandingPage.tsx`

**Interfaces:**
- Consumes: `FileSystemOrbits.pickables / setHovered / setFocus / itemWorldPosition` (Task 2), `ORBIT_PLANET_RADIUS` (Task 1).
- Produces:
  - `type JourneyState = { intro: number; focus: number; focusedItemId: string | null; switchFromItemId: string | null; focusSwitch: number }`
  - `createLandingJourneyScene(host: HTMLElement, state: JourneyState, onItemClick: (itemId: string | null) => void): Promise<LandingJourneyScene | null>`. A click on an item calls `onItemClick(itemId)`; a click on empty space or on the planet calls `onItemClick(null)`.
  - `type HeroFileFocus = { focusedItemId: string | null; openItem: (itemId: string | null, opener: HTMLElement | null) => void; closeItem: () => void }`; `useHeroFileFocus(journeyStateRef: RefObject<JourneyState>): HeroFileFocus`.
  - Focus timing: `focus` tweens 0 to 1 over 1.2 s (`power2.inOut`); orbit speed is `1 - 3 * focus` clamped at 0 (stops at about 0.4 s); release tweens to 0 over 0.8 s; switching items tweens `focusSwitch` 0 to 1 over 0.9 s. Reduced motion makes every duration 0.

- [ ] **Step 1: Extend the scene**

In `apps/web/src/scenes/landingJourneyScene.ts`:

Add the import `import { ORBIT_PLANET_RADIUS } from "./fileOrbitLayout";` after the `celestialBodies` import.

Replace the `JourneyState` type with:

```ts
export type JourneyState = {
  intro: number;
  focus: number;
  focusedItemId: string | null;
  switchFromItemId: string | null;
  focusSwitch: number;
};
```

Replace the constants block from `const ORBIT_SEED` through `const easeOutCubic = gsap.parseEase("power3.out");` with:

```ts
const ORBIT_SEED = 20261007;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const HERO_SHOT: CameraShot = { position: new THREE.Vector3(0, 1.4, 10.5), look: new THREE.Vector3(0, 0.9, 0) };
const HERO_SHOT_ASPECT = 0.95;
const FOCUS_DISTANCE = 1.5;
const FOCUS_LIFT = 0.35;
const FOCUS_LOOK_SHIFT = 0.32;
const FOCUS_ARC_LIFT = 2.2;
const easeOutCubic = gsap.parseEase("power3.out");
const easeInOut = gsap.parseEase("power2.inOut");
const shotMatrix = new THREE.Matrix4();
const shotQuaternion = new THREE.Quaternion();
const focusOutward = new THREE.Vector3();
const focusRight = new THREE.Vector3();
```

After `fitShot`, add:

```ts
function placeCamera(camera: THREE.Camera, shot: CameraShot): void {
  camera.position.copy(shot.position);
  camera.quaternion.setFromRotationMatrix(shotMatrix.lookAt(shot.position, shot.look, WORLD_UP));
}

function blendCameraToward(camera: THREE.Camera, shot: CameraShot, blend: number, arcLift: number): void {
  shotQuaternion.setFromRotationMatrix(shotMatrix.lookAt(shot.position, shot.look, WORLD_UP));
  camera.position.lerp(shot.position, blend).addScaledVector(WORLD_UP, Math.sin(Math.PI * blend) * arcLift);
  camera.quaternion.slerp(shotQuaternion, blend);
}

function aimFocusShot(itemPoint: THREE.Vector3, planetCenter: THREE.Vector3, target: CameraShot): CameraShot {
  focusOutward.copy(itemPoint).sub(planetCenter).setY(0);
  if (focusOutward.lengthSq() < 1e-6) focusOutward.set(0, 0, 1);
  focusOutward.normalize();
  focusRight.crossVectors(WORLD_UP, focusOutward);
  target.position.copy(itemPoint).addScaledVector(focusOutward, FOCUS_DISTANCE).addScaledVector(WORLD_UP, FOCUS_LIFT);
  target.look.copy(itemPoint).addScaledVector(focusRight, FOCUS_LOOK_SHIFT);
  return target;
}
```

Replace the function signature with:

```ts
export async function createLandingJourneyScene(
  host: HTMLElement,
  state: JourneyState,
  onItemClick: (itemId: string | null) => void,
): Promise<LandingJourneyScene | null> {
```

Replace the block from `const machineOne = new THREE.Group();` through the end of `stage.start(...)` with:

```ts
  const machineOne = new THREE.Group();
  const machineOnePlanet = createGlowPlanet("bergamot", disposables);
  const machineOneOrbits = createFileSystemOrbits(SYNCED_FILES, ORBIT_SEED, disposables);
  const occluderGeometry = new THREE.SphereGeometry(ORBIT_PLANET_RADIUS, 24, 16);
  const occluderMaterial = new THREE.MeshBasicMaterial({ visible: false });
  disposables.push(occluderGeometry, occluderMaterial);
  const planetOccluder = new THREE.Mesh(occluderGeometry, occluderMaterial);
  machineOne.add(machineOnePlanet.group, machineOneOrbits.group, planetOccluder);
  scene.add(machineOne);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pickTargets: THREE.Object3D[] = [...machineOneOrbits.pickables, planetOccluder];
  const pickItemAt = (pointerEvent: MouseEvent): string | null => {
    const bounds = host.getBoundingClientRect();
    pointer.set(
      ((pointerEvent.clientX - bounds.left) / bounds.width) * 2 - 1,
      1 - ((pointerEvent.clientY - bounds.top) / bounds.height) * 2,
    );
    raycaster.setFromCamera(pointer, camera);
    const pickedId: unknown = raycaster.intersectObjects(pickTargets, false)[0]?.object.userData.itemId;
    return typeof pickedId === "string" ? pickedId : null;
  };
  const hoverItem = (pointerEvent: PointerEvent) => {
    const hoveredId = pickItemAt(pointerEvent);
    machineOneOrbits.setHovered(hoveredId);
    host.style.cursor = hoveredId ? "pointer" : "";
  };
  const clickItem = (clickEvent: MouseEvent) => onItemClick(pickItemAt(clickEvent));
  host.addEventListener("pointermove", hoverItem);
  host.addEventListener("click", clickItem);
  disposables.push({
    dispose: () => {
      host.removeEventListener("pointermove", hoverItem);
      host.removeEventListener("click", clickItem);
    },
  });

  const heroShot = createShot();
  const focusShot = createShot();
  const itemPoint = new THREE.Vector3();
  const switchPoint = new THREE.Vector3();
  const focusedItemPoint = (): THREE.Vector3 | null => {
    if (!state.focusedItemId || !machineOneOrbits.itemWorldPosition(state.focusedItemId, itemPoint)) return null;
    if (!state.switchFromItemId || !machineOneOrbits.itemWorldPosition(state.switchFromItemId, switchPoint)) {
      return itemPoint;
    }
    return itemPoint.copy(switchPoint.lerp(itemPoint, easeInOut(state.focusSwitch)));
  };

  stage.start((deltaSeconds, elapsedSeconds) => {
    const motionScale = prefersReducedMotion ? 0 : 1;
    const intro = easeOutCubic(state.intro);
    machineOne.scale.setScalar(0.6 + 0.4 * intro);
    machineOnePlanet.update(elapsedSeconds, motionScale, intro);
    machineOneOrbits.setFocus(state.focusedItemId, state.focus);
    machineOneOrbits.update(deltaSeconds, motionScale * Math.max(0, 1 - state.focus * 3), camera.position);
    placeCamera(camera, fitShot(HERO_SHOT, HERO_SHOT_ASPECT, stage.aspect(), heroShot));
    const focusPoint = focusedItemPoint();
    if (focusPoint) {
      blendCameraToward(camera, aimFocusShot(focusPoint, machineOne.position, focusShot), state.focus, FOCUS_ARC_LIFT);
    }
  });
```

The arc lift keeps the camera path above the planet when the focused item is on the far side. `state.focus` is already eased by its tween, so the scene does not ease it again.

- [ ] **Step 2: Create the focus hook**

Create `apps/web/src/lib/useHeroFileFocus.ts`:

```ts
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import gsap from "gsap";
import type { JourneyState } from "../scenes/landingJourneyScene";

export type HeroFileFocus = {
  focusedItemId: string | null;
  openItem: (itemId: string | null, opener: HTMLElement | null) => void;
  closeItem: () => void;
};

function focusMotionScale(): number {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1;
}

export function useHeroFileFocus(journeyStateRef: RefObject<JourneyState>): HeroFileFocus {
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const focusTweenRef = useRef<gsap.core.Tween | null>(null);
  const switchTweenRef = useRef<gsap.core.Tween | null>(null);

  const closeItem = useCallback(() => {
    const journeyState = journeyStateRef.current;
    if (!journeyState.focusedItemId) return;
    focusTweenRef.current?.kill();
    setFocusedItemId(null);
    focusTweenRef.current = gsap.to(journeyState, {
      focus: 0,
      duration: 0.8 * focusMotionScale(),
      ease: "power2.inOut",
      onComplete: () => {
        journeyState.focusedItemId = null;
        journeyState.switchFromItemId = null;
      },
    });
    openerRef.current?.focus({ preventScroll: true });
    openerRef.current = null;
  }, [journeyStateRef]);

  const openItem = useCallback(
    (itemId: string | null, opener: HTMLElement | null) => {
      const journeyState = journeyStateRef.current;
      if (!itemId) {
        closeItem();
        return;
      }
      const previousItemId = journeyState.focusedItemId;
      if (opener) openerRef.current = opener;
      setFocusedItemId(itemId);
      journeyState.focusedItemId = itemId;
      if (previousItemId && previousItemId !== itemId && journeyState.focus > 0) {
        switchTweenRef.current?.kill();
        journeyState.switchFromItemId = previousItemId;
        switchTweenRef.current = gsap.fromTo(
          journeyState,
          { focusSwitch: 0 },
          {
            focusSwitch: 1,
            duration: 0.9 * focusMotionScale(),
            ease: "none",
            onComplete: () => {
              journeyState.switchFromItemId = null;
            },
          },
        );
      }
      focusTweenRef.current?.kill();
      focusTweenRef.current = gsap.to(journeyState, {
        focus: 1,
        duration: 1.2 * focusMotionScale(),
        ease: "power2.inOut",
      });
    },
    [journeyStateRef, closeItem],
  );

  useEffect(() => {
    if (!focusedItemId) return;
    const closeOnEscape = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") closeItem();
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("scroll", closeItem, { passive: true });
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("scroll", closeItem);
    };
  }, [focusedItemId, closeItem]);

  useEffect(
    () => () => {
      focusTweenRef.current?.kill();
      switchTweenRef.current?.kill();
    },
    [],
  );

  return { focusedItemId, openItem, closeItem };
}
```

- [ ] **Step 3: Wire focus into `LandingPage.tsx`**

Change the React import to `import { useCallback, useEffect, useRef } from "react";`.
Change the scene type import to `import type { JourneyState, LandingJourneyScene } from "../scenes/landingJourneyScene";`.
Add `import { useHeroFileFocus } from "../lib/useHeroFileFocus";` after the `defaults` import.
Delete the module-level `loadHeroJourney` constant.

Replace:

```tsx
  const journeyHostRef = useRef<HTMLDivElement>(null);
  const journeyScene = useLazyScene(journeyHostRef, loadHeroJourney);
```

with:

```tsx
  const journeyHostRef = useRef<HTMLDivElement>(null);
  const journeyStateRef = useRef<JourneyState>({
    intro: 0,
    focus: 0,
    focusedItemId: null,
    switchFromItemId: null,
    focusSwitch: 0,
  });
  const openItemRef = useRef<(itemId: string | null, opener: HTMLElement | null) => void>(() => undefined);
  const loadJourney = useCallback<SceneLoader<LandingJourneyScene>>(
    (host) =>
      import("../scenes/landingJourneyScene").then(({ createLandingJourneyScene }) =>
        createLandingJourneyScene(host, journeyStateRef.current, (itemId) => openItemRef.current(itemId, null)),
      ),
    [],
  );
  const journeyScene = useLazyScene(journeyHostRef, loadJourney);
  const heroFocus = useHeroFileFocus(journeyStateRef);
```

Add this effect directly after `const { hash } = useLocation();`:

```tsx
  useEffect(() => {
    openItemRef.current = heroFocus.openItem;
  }, [heroFocus.openItem]);
```

- [ ] **Step 4: Build and gate**

Run: `npm run build -w @cursor-sync/web && node /home/marcelo/.cursor/skills/code-architecture/scripts/quality-gate.mjs`
Expected: both exit 0.

- [ ] **Step 5: Visual check (driven path)**

On `http://localhost:3000`: hover an item (cursor becomes a pointer, the item glows a little); click it (orbits ease to a stop, the camera arcs to the item with the item left of center, the other nine dim to about 30 percent); click a second item (the camera slides to it without a full release); press Esc (camera returns to the hero shot, orbits resume); click an item again, then scroll one notch (release). Take two screenshots: rest and focused.

- [ ] **Step 6: Checkpoint (no commit)**

Report files, exit codes, screenshots, and the open gap: no card yet (Task 5).

---

### Task 5: File focus card

Budget: about 160 production lines, 1 new production file, 4 edited files.

**Files:**
- Create: `apps/web/src/components/FileFocusCard.tsx`
- Modify: `apps/web/src/scenes/landingJourneyScene.ts` (add `projectItem`)
- Modify: `apps/web/src/lib/useHeroFileFocus.ts` (add `stepItem` and card follow)
- Modify: `apps/web/src/pages/LandingPage.tsx`
- Modify: `apps/web/src/pages/LandingPage.css`

**Interfaces:**
- Consumes: `SyncedFile`, `SYNCED_FILES` (Task 1), `useHeroFileFocus` (Task 4).
- Produces:
  - `type ScreenPoint = { x: number; y: number }` (viewport pixels); `LandingJourneyScene.projectItem: (itemId: string) => ScreenPoint | null`.
  - `useHeroFileFocus(journeyStateRef: RefObject<JourneyState>, journeyScene: LandingJourneyScene | null, cardRef: RefObject<HTMLElement | null>): HeroFileFocus` and `HeroFileFocus.stepItem: (direction: 1 | -1) => void`.
  - `FileFocusCard` props: `{ cardRef: RefObject<HTMLElement | null>; syncedFile: SyncedFile; centered: boolean; onClose: () => void; onStep: (direction: 1 | -1) => void }`.

- [ ] **Step 1: Add `projectItem` to the scene**

In `landingJourneyScene.ts`, replace the `LandingJourneyScene` type with:

```ts
export type ScreenPoint = { x: number; y: number };

export type LandingJourneyScene = {
  state: JourneyState;
  projectItem: (itemId: string) => ScreenPoint | null;
  dispose: () => void;
};
```

Add `const projectedPoint = new THREE.Vector3();` after `const switchPoint = new THREE.Vector3();`.
Replace `return { state, dispose: stage.dispose };` with:

```ts
  return {
    state,
    projectItem: (itemId) => {
      if (!machineOneOrbits.itemWorldPosition(itemId, projectedPoint)) return null;
      projectedPoint.project(camera);
      const bounds = host.getBoundingClientRect();
      return {
        x: bounds.left + (projectedPoint.x * 0.5 + 0.5) * bounds.width,
        y: bounds.top + (0.5 - projectedPoint.y * 0.5) * bounds.height,
      };
    },
    dispose: stage.dispose,
  };
```

- [ ] **Step 2: Extend the focus hook**

In `useHeroFileFocus.ts`:

Change the scene import to `import type { JourneyState, LandingJourneyScene } from "../scenes/landingJourneyScene";` and add `import { SYNCED_FILES } from "./syncedFiles";`.

Replace the `HeroFileFocus` type with:

```ts
export type HeroFileFocus = {
  focusedItemId: string | null;
  openItem: (itemId: string | null, opener: HTMLElement | null) => void;
  stepItem: (direction: 1 | -1) => void;
  closeItem: () => void;
};

const CARD_GAP = 40;
const VIEWPORT_MARGIN = 16;
```

Replace the hook signature with:

```ts
export function useHeroFileFocus(
  journeyStateRef: RefObject<JourneyState>,
  journeyScene: LandingJourneyScene | null,
  cardRef: RefObject<HTMLElement | null>,
): HeroFileFocus {
```

After the `openItem` callback, add:

```ts
  const stepItem = useCallback(
    (direction: 1 | -1) => {
      const currentIndex = SYNCED_FILES.findIndex((syncedFile) => syncedFile.id === journeyStateRef.current.focusedItemId);
      const nextIndex = (currentIndex + direction + SYNCED_FILES.length) % SYNCED_FILES.length;
      openItem(SYNCED_FILES[nextIndex].id, null);
    },
    [journeyStateRef, openItem],
  );

  useEffect(() => {
    if (!focusedItemId || !journeyScene) return;
    const followFocusedItem = () => {
      const card = cardRef.current;
      const itemPoint = journeyScene.projectItem(focusedItemId);
      if (!card || !itemPoint) return;
      const maxLeft = window.innerWidth - card.offsetWidth - VIEWPORT_MARGIN;
      const maxTop = window.innerHeight - card.offsetHeight - VIEWPORT_MARGIN;
      const left = gsap.utils.clamp(VIEWPORT_MARGIN, maxLeft, itemPoint.x + CARD_GAP);
      const top = gsap.utils.clamp(VIEWPORT_MARGIN, maxTop, itemPoint.y - card.offsetHeight / 2);
      card.style.transform = `translate(${left}px, ${top}px)`;
    };
    gsap.ticker.add(followFocusedItem);
    return () => gsap.ticker.remove(followFocusedItem);
  }, [focusedItemId, journeyScene, cardRef]);
```

Replace `return { focusedItemId, openItem, closeItem };` with `return { focusedItemId, openItem, stepItem, closeItem };`.

- [ ] **Step 3: Create the card**

Create `apps/web/src/components/FileFocusCard.tsx`:

```tsx
import { useEffect, useRef, type RefObject } from "react";
import type { SyncedFile } from "../lib/syncedFiles";

type FileFocusCardProps = {
  cardRef: RefObject<HTMLElement | null>;
  syncedFile: SyncedFile;
  centered: boolean;
  onClose: () => void;
  onStep: (direction: 1 | -1) => void;
};

export function FileFocusCard({ cardRef, syncedFile, centered, onClose, onStep }: FileFocusCardProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section
      ref={cardRef}
      className={centered ? "file-focus-card is-centered" : "file-focus-card"}
      aria-labelledby="file-focus-title"
    >
      <div className="file-focus-head">
        <span className="mono file-focus-kind">{syncedFile.kind}</span>
        <button ref={closeButtonRef} type="button" className="file-focus-button" onClick={onClose}>
          Close
        </button>
      </div>
      <h2 id="file-focus-title" className="mono file-focus-title">
        {syncedFile.label}
      </h2>
      <dl className="file-focus-facts">
        <div>
          <dt>What it is</dt>
          <dd>{syncedFile.whatItIs}</dd>
        </div>
        <div>
          <dt>How it helps you</dt>
          <dd>{syncedFile.howItHelps}</dd>
        </div>
      </dl>
      <div className="file-focus-steps">
        <button type="button" className="file-focus-button" onClick={() => onStep(-1)}>
          Previous
        </button>
        <button type="button" className="file-focus-button" onClick={() => onStep(1)}>
          Next
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Render the card in `LandingPage.tsx`**

Add imports: `import { FileFocusCard } from "../components/FileFocusCard";` (after the `Nav`-group component imports, alphabetical) and `import { SYNCED_FILES } from "../lib/syncedFiles";`.

Add `const focusCardRef = useRef<HTMLElement>(null);` after `journeyHostRef`.
Replace `const heroFocus = useHeroFileFocus(journeyStateRef);` with:

```tsx
  const heroFocus = useHeroFileFocus(journeyStateRef, journeyScene, focusCardRef);
  const focusedFile = SYNCED_FILES.find((syncedFile) => syncedFile.id === heroFocus.focusedItemId);
```

Inside the hero `<section>`, directly after the closing `</div>` of `.hero-visual`, add:

```tsx
          {focusedFile ? (
            <FileFocusCard
              cardRef={focusCardRef}
              syncedFile={focusedFile}
              centered={!journeyScene}
              onClose={heroFocus.closeItem}
              onStep={heroFocus.stepItem}
            />
          ) : null}
```

- [ ] **Step 5: Card styles**

In `LandingPage.css`, insert directly before `@media (max-width: 900px) {`:

```css
.file-focus-card {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 40;
  width: min(320px, calc(100vw - 32px));
  padding: var(--space-3);
  border: 1px solid rgba(68, 71, 74, 0.6);
  border-radius: var(--radius-card);
  background: rgba(14, 14, 16, 0.92);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7);
  animation: file-focus-in 0.35s ease-out both;
}

.file-focus-card.is-centered {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

@keyframes file-focus-in {
  from {
    opacity: 0;
  }
}

.file-focus-head,
.file-focus-steps {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.file-focus-head {
  margin-bottom: var(--space-1);
}

.file-focus-kind {
  color: var(--color-faint);
  text-transform: uppercase;
}

.file-focus-button {
  padding: 4px 10px;
  border: 1px solid rgba(68, 71, 74, 0.6);
  border-radius: var(--radius-control);
  background: var(--color-panel);
  color: var(--color-ink);
  font-size: 12px;
  cursor: pointer;
}

.file-focus-button:hover {
  border-color: var(--color-faint);
}

.file-focus-title {
  margin: 0 0 var(--space-2);
  color: var(--color-bergamota-light);
  font-size: 15px;
}

.file-focus-facts {
  margin: 0 0 var(--space-3);
}

.file-focus-facts div + div {
  margin-top: var(--space-2);
}

.file-focus-facts dt {
  margin-bottom: 4px;
  color: var(--color-faint);
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
}

.file-focus-facts dd {
  margin: 0;
  color: var(--color-ink);
  font-size: 14px;
  line-height: 1.55;
}
```

- [ ] **Step 6: Build and gate**

Run: `npm run build -w @cursor-sync/web && node /home/marcelo/.cursor/skills/code-architecture/scripts/quality-gate.mjs`
Expected: both exit 0.

- [ ] **Step 7: Visual check (driven path)**

Click an item: the card appears beside it (right of the item, clamped inside the viewport), shows the name, "What it is", "How it helps you", and keyboard focus is on Close. Next and Previous move the camera to the adjacent item and change the card text. Close, Esc, a click on empty space, and a scroll each close the card. Screenshot the focused state with the card.

- [ ] **Step 8: Checkpoint (no commit)**

Report files, exit codes, screenshot.

---

### Task 6: Centered hero layout and keyboard file list

Budget: about 95 added production lines (plus about 230 deleted), 2 edited files.

**Files:**
- Modify: `apps/web/src/pages/LandingPage.tsx`
- Modify: `apps/web/src/pages/LandingPage.css`

**Interfaces:**
- Consumes: `heroFocus.openItem(itemId, opener)` (Task 4), `SYNCED_FILES` (Task 1).
- Produces: DOM contract used by Task 10: `section.journey` > `div.journey-stage` > (`div.hero-backlight`, `div.journey-canvas`, `div.hero-copy`, `ul.hero-file-list`, optional `FileFocusCard`). `CursorWindowMock` is gone.

- [ ] **Step 1: Delete `CursorWindowMock`**

In `LandingPage.tsx`, delete the whole `function CursorWindowMock() { ... }` block.
In the reveal effect, delete the line `gsap.from(".hero-window", { x: 40, opacity: 0, duration: 1.2, ease: "power3.out", delay: 0.6 });`.

- [ ] **Step 2: Replace the hero section JSX**

Replace the whole `<section className="hero" aria-labelledby="hero-title"> ... </section>` element (including the card block added in Task 5) with:

```tsx
        <section className="journey" aria-labelledby="hero-title">
          <div className="journey-stage">
            <div className="hero-backlight" aria-hidden="true" />
            <div ref={journeyHostRef} className="journey-canvas" aria-hidden="true" />
            <div className="hero-copy">
              <h1 id="hero-title" className="hero-title hero-reveal">
                Your Cursor setup, in orbit.
              </h1>
              <p className="hero-sub hero-reveal">Settings, rules, and skills follow you to every computer.</p>
              <div className="hero-actions hero-reveal">
                <a className="hero-action hero-action--primary" href={EXTENSION_LISTING_URL} target="_blank" rel="noreferrer">
                  Install
                </a>
                <Link className="hero-action hero-action--secondary" to="/sign-in">
                  Sign in
                </Link>
              </div>
            </div>
            <ul className="hero-file-list" aria-label="Files that sync">
              {SYNCED_FILES.map((syncedFile) => (
                <li key={syncedFile.id}>
                  <button
                    type="button"
                    className="hero-file-button mono"
                    onClick={(clickEvent) => heroFocus.openItem(syncedFile.id, clickEvent.currentTarget)}
                  >
                    {syncedFile.label}
                  </button>
                </li>
              ))}
            </ul>
            {focusedFile ? (
              <FileFocusCard
                cardRef={focusCardRef}
                syncedFile={focusedFile}
                centered={!journeyScene}
                onClose={heroFocus.closeItem}
                onStep={heroFocus.stepItem}
              />
            ) : null}
          </div>
        </section>
```

- [ ] **Step 3: Replace the hero styles**

In `LandingPage.css`, replace the `.hero { ... }` block with:

```css
.journey {
  position: relative;
}

.journey-stage {
  position: relative;
  height: 100vh;
  height: 100svh;
  overflow: hidden;
}

.journey-canvas {
  position: absolute;
  inset: 0;
}

.journey-canvas[data-webgl="off"] {
  background: radial-gradient(circle at 50% 64%, #ffa366 0, #e87a2e 8%, #b85014 12%, #682604 15%, transparent 17%);
}
```

In `.hero-backlight`, change `top: 18%;` to `top: 34%;`.

Replace the `.hero-copy { ... }` block with:

```css
.hero-copy {
  position: relative;
  max-width: 640px;
  margin: 0 auto;
  padding: 112px var(--space-2) 0;
  text-align: center;
  pointer-events: none;
}
```

In `.hero-action`, add `pointer-events: auto;` as the last declaration.

Delete everything from `.hero-visual {` through the end of the `.hero-window-status { ... }` block (the rules for `.hero-visual`, `.hero-orbit`, `.hero-orbit[data-webgl="off"]`, every `.hero-window*` rule, and `@keyframes sealed-pulse`). In their place insert:

```css
.hero-file-list {
  position: absolute;
  left: 50%;
  bottom: var(--space-4);
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-1);
  width: min(720px, calc(100% - 32px));
  margin: 0;
  padding: 0;
  list-style: none;
  transform: translateX(-50%);
  clip-path: inset(50%);
}

.hero-file-list:focus-within {
  clip-path: none;
}

.hero-file-button {
  padding: 6px 10px;
  border: 1px solid rgba(68, 71, 74, 0.6);
  border-radius: var(--radius-control);
  background: rgba(14, 14, 16, 0.88);
  color: var(--color-ink);
  cursor: pointer;
}
```

Delete the whole `@media (max-width: 900px) { ... }` block. Replace the `@media (max-width: 480px) { ... }` block with:

```css
@media (max-width: 480px) {
  .hero-copy {
    padding-top: 72px;
  }
}
```

- [ ] **Step 4: Build and check for dead names**

Run: `npm run build -w @cursor-sync/web && rg -n "hero-window|hero-orbit|hero-visual|CursorWindowMock" apps/web/src`
Expected: build exit 0; `rg` prints nothing (exit 1).

- [ ] **Step 5: Visual check (driven path)**

At 1440x900 and at 390x844: headline, sub line, and buttons centered on top; planet system large and centered below; buttons clickable; the planet still clickable around the copy. Press Tab from the Sign in button: the file list appears at the bottom; Enter on `rules/` opens the card; Esc closes it and focus returns to the `rules/` button. Screenshot desktop rest, mobile rest, keyboard list visible.

- [ ] **Step 6: Checkpoint (no commit)**

Report files, exit codes, screenshots.

---

### Task 7: Story timeline module

Budget: about 95 production lines, 1 new production file, 1 new test file.

**Files:**
- Create: `apps/web/src/lib/syncStoryTimeline.ts`
- Test: `apps/web/src/lib/syncStoryTimeline.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type SyncStep = { number: string; title: string; detail: string }`; `const SYNC_STEPS: readonly SyncStep[]` (4 steps, spec copy).
  - `const SYNC_STEP_LABELS = ["step1", "step2", "step3", "step4"] as const`.
  - `const JOURNEY_SEGMENTS = { hero: 0.4, handoff: 1, step: 1, tail: 0.4 } as const`; `const JOURNEY_LENGTH` (4.8 viewports).
  - Story progress `story` runs 0 to 3: label `step1` at 0 (handoff end), `step2` at 1, `step3` at 2, `step4` at 3.
  - `stepIndexAtStory(storyProgress: number): number` (nearest label, clamped 0..3).
  - `storyLegProgress(storyProgress: number, legIndex: 1 | 2): number` (leg 1 = upload during story 1..2, leg 2 = download during 2..3).
  - `const ROCKET_STAGGER = 0.06`; `rocketLegProgress(legProgress: number, rocketIndex: number, rocketCount: number, stagger: number): number`.
  - `type AutoplayStatus = "idle" | "waiting" | "playing" | "stopped"`; `type AutoplayEvent = "story-entered" | "story-left" | "quiet-elapsed" | "last-step-held" | "user-input" | "scroll-killed" | "step-selected" | "tab-hidden" | "toggle"`; `nextAutoplayStatus(status: AutoplayStatus, event: AutoplayEvent): AutoplayStatus`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/syncStoryTimeline.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  JOURNEY_LENGTH,
  ROCKET_STAGGER,
  SYNC_STEPS,
  SYNC_STEP_LABELS,
  nextAutoplayStatus,
  rocketLegProgress,
  stepIndexAtStory,
  storyLegProgress,
  type AutoplayEvent,
  type AutoplayStatus,
} from "./syncStoryTimeline";

const ROCKET_COUNT = 10;

function runAutoplay(status: AutoplayStatus, events: readonly AutoplayEvent[]): AutoplayStatus {
  return events.reduce(nextAutoplayStatus, status);
}

describe("sync story steps", () => {
  it("has one timeline label per step", () => {
    expect(SYNC_STEP_LABELS).toHaveLength(SYNC_STEPS.length);
  });

  it("maps story progress to the nearest step label", () => {
    expect([-1, 0, 0.49, 0.5, 1.4, 2.6, 3, 9].map((story) => stepIndexAtStory(story))).toEqual([0, 0, 0, 1, 1, 3, 3, 3]);
  });

  it("pins the journey for hero, handoff, three step moves, and a tail", () => {
    expect(JOURNEY_LENGTH).toBeCloseTo(4.8, 10);
  });
});

describe("rocket leg progress", () => {
  it("is 0 before the leg and 1 after it for every rocket", () => {
    for (let rocketIndex = 0; rocketIndex < ROCKET_COUNT; rocketIndex += 1) {
      expect(rocketLegProgress(0, rocketIndex, ROCKET_COUNT, ROCKET_STAGGER)).toBe(0);
      expect(rocketLegProgress(1, rocketIndex, ROCKET_COUNT, ROCKET_STAGGER)).toBe(1);
    }
  });

  it("never moves backward while the story moves forward", () => {
    for (let rocketIndex = 0; rocketIndex < ROCKET_COUNT; rocketIndex += 1) {
      let previousFlight = 0;
      for (let story = 0; story <= 3; story += 0.01) {
        const flight = rocketLegProgress(storyLegProgress(story, 1), rocketIndex, ROCKET_COUNT, ROCKET_STAGGER);
        expect(flight).toBeGreaterThanOrEqual(previousFlight);
        previousFlight = flight;
      }
    }
  });

  it("launches later rockets after earlier ones", () => {
    const midLeg = [0, 4, 9].map((rocketIndex) => rocketLegProgress(0.5, rocketIndex, ROCKET_COUNT, ROCKET_STAGGER));
    expect(midLeg[0]).toBeGreaterThan(midLeg[1]);
    expect(midLeg[1]).toBeGreaterThan(midLeg[2]);
  });

  it("keeps the upload leg inside step 03 and the download leg inside step 04", () => {
    expect(storyLegProgress(1, 1)).toBe(0);
    expect(storyLegProgress(2, 1)).toBe(1);
    expect(storyLegProgress(2, 2)).toBe(0);
    expect(storyLegProgress(3, 2)).toBe(1);
  });
});

describe("story autoplay", () => {
  it("waits when the story starts and plays after a quiet pause", () => {
    expect(runAutoplay("idle", ["story-entered"])).toBe("waiting");
    expect(runAutoplay("idle", ["story-entered", "quiet-elapsed"])).toBe("playing");
  });

  it("stops playing on user input", () => {
    expect(runAutoplay("playing", ["user-input"])).toBe("stopped");
  });

  it("keeps waiting through user input so scrolling only restarts the quiet timer", () => {
    expect(runAutoplay("waiting", ["user-input"])).toBe("waiting");
  });

  it("stops when the user kills the scroll tween", () => {
    expect(runAutoplay("playing", ["scroll-killed"])).toBe("stopped");
  });

  it("stops waiting or playing when the user picks a step", () => {
    expect(runAutoplay("waiting", ["step-selected"])).toBe("stopped");
    expect(runAutoplay("playing", ["step-selected"])).toBe("stopped");
    expect(runAutoplay("idle", ["step-selected"])).toBe("idle");
  });

  it("stops after holding the last step and never loops", () => {
    expect(runAutoplay("playing", ["last-step-held", "quiet-elapsed"])).toBe("stopped");
  });

  it("pauses to waiting when the tab is hidden", () => {
    expect(runAutoplay("playing", ["tab-hidden"])).toBe("waiting");
  });

  it("resets to idle when the story segment is left", () => {
    expect(runAutoplay("stopped", ["story-left"])).toBe("idle");
    expect(runAutoplay("playing", ["story-left"])).toBe("idle");
  });

  it("toggles between playing and stopped from the play button", () => {
    expect(runAutoplay("stopped", ["toggle"])).toBe("playing");
    expect(runAutoplay("waiting", ["toggle"])).toBe("playing");
    expect(runAutoplay("playing", ["toggle"])).toBe("stopped");
  });

  it("ignores a quiet pause outside the story", () => {
    expect(runAutoplay("idle", ["quiet-elapsed"])).toBe("idle");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @cursor-sync/web -- src/lib/syncStoryTimeline.test.ts`
Expected: FAIL, `Failed to resolve import "./syncStoryTimeline"`.

- [ ] **Step 3: Write the module**

Create `apps/web/src/lib/syncStoryTimeline.ts`:

```ts
export type SyncStep = {
  number: string;
  title: string;
  detail: string;
};

export type AutoplayStatus = "idle" | "waiting" | "playing" | "stopped";

export type AutoplayEvent =
  | "story-entered"
  | "story-left"
  | "quiet-elapsed"
  | "last-step-held"
  | "user-input"
  | "scroll-killed"
  | "step-selected"
  | "tab-hidden"
  | "toggle";

export const SYNC_STEPS: readonly SyncStep[] = [
  {
    number: "01",
    title: "Install",
    detail: "Add Cursor Sync to Cursor. Your setup is the little world of files around your computer.",
  },
  {
    number: "02",
    title: "Secret word",
    detail: "Pick a passphrase. Only you know it, and every copy is locked with it.",
  },
  {
    number: "03",
    title: "Copy up",
    detail: "Cursor Sync sends copies to a safe spot in the cloud. Your originals stay right where they are.",
  },
  {
    number: "04",
    title: "Copy down",
    detail: "Your other computer uses the same passphrase to get the copies. Now both match.",
  },
];

export const SYNC_STEP_LABELS = ["step1", "step2", "step3", "step4"] as const;

export const JOURNEY_SEGMENTS = { hero: 0.4, handoff: 1, step: 1, tail: 0.4 } as const;

export const JOURNEY_LENGTH =
  JOURNEY_SEGMENTS.hero +
  JOURNEY_SEGMENTS.handoff +
  JOURNEY_SEGMENTS.step * (SYNC_STEP_LABELS.length - 1) +
  JOURNEY_SEGMENTS.tail;

export const ROCKET_STAGGER = 0.06;

function clampUnit(amount: number): number {
  return Math.min(1, Math.max(0, amount));
}

export function stepIndexAtStory(storyProgress: number): number {
  return Math.min(SYNC_STEP_LABELS.length - 1, Math.max(0, Math.round(storyProgress)));
}

export function storyLegProgress(storyProgress: number, legIndex: 1 | 2): number {
  return clampUnit(storyProgress - legIndex);
}

export function rocketLegProgress(legProgress: number, rocketIndex: number, rocketCount: number, stagger: number): number {
  const flightShare = 1 - stagger * (rocketCount - 1);
  return clampUnit((legProgress - stagger * rocketIndex) / flightShare);
}

export function nextAutoplayStatus(status: AutoplayStatus, event: AutoplayEvent): AutoplayStatus {
  switch (event) {
    case "story-entered":
      return status === "idle" ? "waiting" : status;
    case "story-left":
      return "idle";
    case "quiet-elapsed":
      return status === "waiting" ? "playing" : status;
    case "last-step-held":
    case "user-input":
    case "scroll-killed":
      return status === "playing" ? "stopped" : status;
    case "step-selected":
      return status === "idle" ? status : "stopped";
    case "tab-hidden":
      return status === "playing" ? "waiting" : status;
    case "toggle":
      return status === "playing" ? "stopped" : "playing";
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -w @cursor-sync/web -- src/lib/syncStoryTimeline.test.ts`
Expected: PASS, 17 tests.

- [ ] **Step 5: Scoped suite, build, gate**

Run: `npm test -w @cursor-sync/web && npm run build -w @cursor-sync/web && node /home/marcelo/.cursor/skills/code-architecture/scripts/quality-gate.mjs`
Expected: 8 test files pass, build exit 0, gate exit 0.

- [ ] **Step 6: Checkpoint (no commit)**

Report files and exit codes. Consumers land in Tasks 8 to 11.

---

### Task 8: Sync rockets

Budget: about 185 production lines, 1 new production file.

**Files:**
- Create: `apps/web/src/scenes/syncRockets.ts`

**Interfaces:**
- Consumes: `SyncedFile` (Task 1), `ORBIT_PLANET_RADIUS` (Task 1), `ROCKET_STAGGER`, `rocketLegProgress` (Task 7), `createSoftDotTexture`, `createFileLabelSprite`.
- Produces:
  - `type SyncRoute = { machineOne: THREE.Vector3; machineTwo: THREE.Vector3; docks: readonly THREE.Vector3[] }` (one dock per rocket, world space).
  - `type SyncRockets = { group: THREE.Group; update: (uploadLeg: number, downloadLeg: number, elapsedSeconds: number, motionScale: number) => void }`.
  - `createSyncRockets(syncedFiles: readonly SyncedFile[], route: SyncRoute, disposables: Disposable[]): SyncRockets`. A rocket is visible only while its own leg progress is strictly between 0 and 1; travel reads no time, so scrubbing backward reverses cleanly.

Leg math is covered by Task 7 tests; this module is verified by the build here and visually in Task 9.

- [ ] **Step 1: Create the module**

Create `apps/web/src/scenes/syncRockets.ts`:

```ts
import * as THREE from "three";
import gsap from "gsap";
import type { SyncedFile } from "../lib/syncedFiles";
import { ROCKET_STAGGER, rocketLegProgress } from "../lib/syncStoryTimeline";
import { createSoftDotTexture } from "./celestialBodies";
import { ORBIT_PLANET_RADIUS } from "./fileOrbitLayout";
import { createFileLabelSprite } from "./orbitFileLabel";
import type { Disposable } from "./sceneStage";

export type SyncRoute = {
  machineOne: THREE.Vector3;
  machineTwo: THREE.Vector3;
  docks: readonly THREE.Vector3[];
};

export type SyncRockets = {
  group: THREE.Group;
  update: (uploadLeg: number, downloadLeg: number, elapsedSeconds: number, motionScale: number) => void;
};

type RocketLegPath = { start: THREE.Vector3; control: THREE.Vector3; end: THREE.Vector3 };

type RocketTrail = THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;

type RocketParts = {
  hull: THREE.LatheGeometry;
  nose: THREE.ConeGeometry;
  fin: THREE.BoxGeometry;
  hullMaterial: THREE.MeshStandardMaterial;
  trimMaterial: THREE.MeshStandardMaterial;
  exhaustTexture: THREE.CanvasTexture;
  exhaustMaterial: THREE.SpriteMaterial;
};

type FlightRocket = {
  body: THREE.Group;
  exhaust: THREE.Sprite;
  label: THREE.Sprite;
  trail: RocketTrail;
  uploadPath: RocketLegPath;
  downloadPath: RocketLegPath;
};

const TRAIL_POINTS = 18;
const TRAIL_SPAN = 0.16;
const SURFACE_LIFT = 1.04;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const TRAIL_COLOR = new THREE.Color("#ffa366");
const easeInOut = gsap.parseEase("power2.inOut");
const pathChord = new THREE.Vector3();
const pathTangent = new THREE.Vector3();
const arcNormal = new THREE.Vector3();
const rocketSide = new THREE.Vector3();
const rocketBasis = new THREE.Matrix4();
const trailPoint = new THREE.Vector3();

function bezierPoint(path: RocketLegPath, progress: number, target: THREE.Vector3): THREE.Vector3 {
  const remaining = 1 - progress;
  return target
    .copy(path.start)
    .multiplyScalar(remaining * remaining)
    .addScaledVector(path.control, 2 * remaining * progress)
    .addScaledVector(path.end, progress * progress);
}

function orientRocket(body: THREE.Object3D, path: RocketLegPath, progress: number): void {
  pathTangent.subVectors(path.control, path.start).multiplyScalar(2 * (1 - progress));
  pathTangent.addScaledVector(pathChord.subVectors(path.end, path.control), 2 * progress).normalize();
  arcNormal.subVectors(path.control, path.start).cross(pathChord.subVectors(path.end, path.start));
  if (arcNormal.lengthSq() < 1e-8) arcNormal.set(0, 0, 1);
  arcNormal.normalize();
  rocketSide.crossVectors(arcNormal, pathTangent).normalize();
  body.quaternion.setFromRotationMatrix(rocketBasis.makeBasis(arcNormal, pathTangent, rocketSide));
}

function createLegPath(from: THREE.Vector3, to: THREE.Vector3, lift: number): RocketLegPath {
  return { start: from.clone(), control: from.clone().lerp(to, 0.5).addScaledVector(WORLD_UP, lift), end: to.clone() };
}

function surfacePoint(center: THREE.Vector3, toward: THREE.Vector3, spread: number): THREE.Vector3 {
  const direction = toward.clone().sub(center).normalize();
  direction.y += spread;
  direction.z += spread * 0.4;
  return direction.normalize().multiplyScalar(ORBIT_PLANET_RADIUS * SURFACE_LIFT).add(center);
}

function createRocketParts(disposables: Disposable[]): RocketParts {
  const exhaustTexture = createSoftDotTexture();
  const parts: RocketParts = {
    hull: new THREE.LatheGeometry(
      [new THREE.Vector2(0, -0.1), new THREE.Vector2(0.032, -0.1), new THREE.Vector2(0.04, -0.06), new THREE.Vector2(0.04, 0.06)],
      20,
    ),
    nose: new THREE.ConeGeometry(0.04, 0.09, 20),
    fin: new THREE.BoxGeometry(0.006, 0.06, 0.045),
    hullMaterial: new THREE.MeshStandardMaterial({ color: "#e5e1e4", metalness: 0.45, roughness: 0.35 }),
    trimMaterial: new THREE.MeshStandardMaterial({
      color: "#e87a2e",
      emissive: "#e87a2e",
      emissiveIntensity: 0.6,
      roughness: 0.4,
    }),
    exhaustTexture,
    exhaustMaterial: new THREE.SpriteMaterial({
      map: exhaustTexture,
      color: "#ffa366",
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  };
  disposables.push(
    parts.hull,
    parts.nose,
    parts.fin,
    parts.hullMaterial,
    parts.trimMaterial,
    parts.exhaustTexture,
    parts.exhaustMaterial,
  );
  return parts;
}

function createRocketBody(parts: RocketParts): { body: THREE.Group; exhaust: THREE.Sprite } {
  const nose = new THREE.Mesh(parts.nose, parts.trimMaterial);
  nose.position.y = 0.105;
  const body = new THREE.Group();
  body.add(new THREE.Mesh(parts.hull, parts.hullMaterial), nose);
  for (let finIndex = 0; finIndex < 3; finIndex += 1) {
    const fin = new THREE.Mesh(parts.fin, parts.trimMaterial);
    fin.position.set(0, -0.075, 0.058);
    const finPivot = new THREE.Group();
    finPivot.rotation.y = (finIndex / 3) * Math.PI * 2;
    finPivot.add(fin);
    body.add(finPivot);
  }
  const exhaust = new THREE.Sprite(parts.exhaustMaterial);
  exhaust.position.y = -0.14;
  body.add(exhaust);
  return { body, exhaust };
}

function createTrail(disposables: Disposable[]): RocketTrail {
  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAIL_POINTS * 3), 3));
  trailGeometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(TRAIL_POINTS * 3), 3));
  const trailMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  disposables.push(trailGeometry, trailMaterial);
  const trail = new THREE.Line(trailGeometry, trailMaterial);
  trail.frustumCulled = false;
  return trail;
}

function updateTrail(trail: RocketTrail, path: RocketLegPath, flight: number, envelope: number): void {
  const positions = trail.geometry.getAttribute("position");
  const colors = trail.geometry.getAttribute("color");
  for (let pointIndex = 0; pointIndex < TRAIL_POINTS; pointIndex += 1) {
    const age = pointIndex / (TRAIL_POINTS - 1);
    bezierPoint(path, easeInOut(Math.max(0, flight - age * TRAIL_SPAN)), trailPoint);
    positions.setXYZ(pointIndex, trailPoint.x, trailPoint.y, trailPoint.z);
    const fade = (1 - age) ** 1.6 * envelope;
    colors.setXYZ(pointIndex, TRAIL_COLOR.r * fade, TRAIL_COLOR.g * fade, TRAIL_COLOR.b * fade);
  }
  positions.needsUpdate = true;
  colors.needsUpdate = true;
}

export function createSyncRockets(
  syncedFiles: readonly SyncedFile[],
  route: SyncRoute,
  disposables: Disposable[],
): SyncRockets {
  const parts = createRocketParts(disposables);
  const group = new THREE.Group();
  const rocketCount = syncedFiles.length;
  const rockets = syncedFiles.map((syncedFile, rocketIndex): FlightRocket => {
    const spread = rocketCount > 1 ? rocketIndex / (rocketCount - 1) - 0.5 : 0;
    const dock = route.docks[rocketIndex];
    const { body, exhaust } = createRocketBody(parts);
    const label = createFileLabelSprite(syncedFile.label, "plain", 0.14, disposables);
    const trail = createTrail(disposables);
    group.add(body, label, trail);
    return {
      body,
      exhaust,
      label,
      trail,
      uploadPath: createLegPath(surfacePoint(route.machineOne, dock, spread * 0.9), dock, 1.1 + spread * 0.5),
      downloadPath: createLegPath(dock, surfacePoint(route.machineTwo, dock, spread * 0.9), 0.9 - spread * 0.4),
    };
  });

  return {
    group,
    update: (uploadLeg, downloadLeg, elapsedSeconds, motionScale) => {
      rockets.forEach((rocket, rocketIndex) => {
        const uploadFlight = rocketLegProgress(uploadLeg, rocketIndex, rocketCount, ROCKET_STAGGER);
        const downloadFlight = rocketLegProgress(downloadLeg, rocketIndex, rocketCount, ROCKET_STAGGER);
        const downloading = downloadFlight > 0;
        const flight = downloading ? downloadFlight : uploadFlight;
        const path = downloading ? rocket.downloadPath : rocket.uploadPath;
        const flying = flight > 0 && flight < 1;
        rocket.body.visible = flying;
        rocket.label.visible = flying;
        rocket.trail.visible = flying;
        if (!flying) return;
        const pathProgress = easeInOut(flight);
        bezierPoint(path, pathProgress, rocket.body.position);
        orientRocket(rocket.body, path, pathProgress);
        rocket.label.position.copy(rocket.body.position).addScaledVector(WORLD_UP, 0.17);
        const envelope = Math.sin(Math.PI * flight);
        const flicker = 1 - 0.25 * motionScale * (0.5 + 0.5 * Math.sin(elapsedSeconds * 38 + rocketIndex * 1.7));
        rocket.exhaust.scale.setScalar(0.02 + 0.16 * envelope * flicker);
        updateTrail(rocket.trail, path, flight, envelope);
      });
    },
  };
}
```

- [ ] **Step 2: Build and gate**

Run: `npm run build -w @cursor-sync/web && node /home/marcelo/.cursor/skills/code-architecture/scripts/quality-gate.mjs`
Expected: both exit 0. `wc -l apps/web/src/scenes/syncRockets.ts` prints at most 300.

- [ ] **Step 3: Checkpoint (no commit)**

Report the file and exit codes; visual proof comes in Task 9.

---

### Task 9: Story world in the journey scene

Budget: about 175 added production lines, 4 edited files, no new file.

**Files:**
- Modify: `apps/web/src/scenes/fileSystemOrbits.ts` (presence and pulse)
- Modify: `apps/web/src/scenes/syncStoryProps.ts` (add `createCloudStation`; the old relay stays until Task 14 because `planetOrbitScene.ts` still imports it)
- Modify: `apps/web/src/scenes/landingJourneyScene.ts`
- Modify: `apps/web/src/pages/LandingPage.tsx` (state initializer only)

**Interfaces:**
- Consumes: `createSyncRockets`, `SyncRoute` (Task 8); `ROCKET_STAGGER`, `rocketLegProgress`, `storyLegProgress` (Task 7); `createPassphraseKey` (existing).
- Produces:
  - `FileSystemOrbits.setPresence: (itemIndex: number, presence: number) => void` (0 hides an item, 1 shows it; default 1) and `FileSystemOrbits.setPulse: (itemIndex: number, pulse: number) => void` (0..1 scale and glow boost; default 0).
  - `type CloudStation = { group: THREE.Group; docks: readonly THREE.Vector3[]; update: (copyPresence: readonly number[], glow: number, elapsedSeconds: number, motionScale: number) => void }`; `createCloudStation(position: THREE.Vector3, dockCount: number, disposables: Disposable[]): CloudStation`.
  - `JourneyState` gains `handoff: number` (0..1) and `story: number` (0..3). Picking works only while `handoff < 0.02`.
  - World layout: machine 01 glides from the origin to `(-3.6, -0.3, 0)`; station at `(0.4, 1.7, -0.8)`; machine 02 at `(4.4, -0.4, 0)`. Camera: hero pose, then focus blend, then story blend by `handoff`. Story shots: `story` 0..1 frames machine 01, 1..2 widens to the station, 2..3 goes wide on all three bodies.

- [ ] **Step 1: Presence and pulse in `fileSystemOrbits.ts`**

Add to the `FileSystemOrbits` type, after `setFocus`:

```ts
  setPresence: (itemIndex: number, presence: number) => void;
  setPulse: (itemIndex: number, pulse: number) => void;
```

After `let focusAmount = 0;` add:

```ts
  const presences = orbitItems.map(() => 1);
  const pulses = orbitItems.map(() => 0);
```

In the `orbitItems.forEach` loop inside `update`, replace:

```ts
        orbitItem.material.opacity = opacity;
        orbitItem.material.emissiveIntensity = emphasized ? HOVER_GLOW : REST_GLOW;
        orbitItem.label.material.opacity = opacity;
```

with:

```ts
        const presence = presences[itemIndex];
        const pulse = pulses[itemIndex];
        orbitItem.body.visible = presence > 0.01;
        orbitItem.label.visible = presence > 0.01;
        orbitItem.body.scale.setScalar(Math.max(presence, 0.001) * (1 + 0.6 * pulse));
        orbitItem.material.opacity = opacity;
        orbitItem.material.emissiveIntensity = (emphasized ? HOVER_GLOW : REST_GLOW) + 1.5 * pulse;
        orbitItem.label.material.opacity = opacity;
```

After the `setFocus` member of the returned object add:

```ts
    setPresence: (itemIndex, presence) => {
      presences[itemIndex] = presence;
    },
    setPulse: (itemIndex, pulse) => {
      pulses[itemIndex] = pulse;
    },
```

- [ ] **Step 2: Cloud station in `syncStoryProps.ts`**

After the `SyncRelay` type add:

```ts
export type CloudStation = {
  group: THREE.Group;
  docks: readonly THREE.Vector3[];
  update: (copyPresence: readonly number[], glow: number, elapsedSeconds: number, motionScale: number) => void;
};
```

After `const easeOutBack = gsap.parseEase("back.out(1.7)");` add `const STATION_RING_RADIUS = 0.62;`.

At the end of the file add:

```ts
export function createCloudStation(position: THREE.Vector3, dockCount: number, disposables: Disposable[]): CloudStation {
  const hubGeometry = new THREE.CylinderGeometry(0.34, 0.34, 0.12, 40);
  const hubMaterial = new THREE.MeshStandardMaterial({
    color: "#201f22",
    emissive: "#38bdf8",
    emissiveIntensity: 0.1,
    metalness: 0.6,
    roughness: 0.35,
  });
  const ringGeometry = new THREE.TorusGeometry(STATION_RING_RADIUS, 0.016, 8, 96);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: "#38bdf8",
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const copyGeometry = new THREE.BoxGeometry(0.07, 0.09, 0.012);
  const copyMaterial = new THREE.MeshStandardMaterial({ color: "#ffa366", emissive: "#e87a2e", emissiveIntensity: 1.1 });
  disposables.push(hubGeometry, hubMaterial, ringGeometry, ringMaterial, copyGeometry, copyMaterial);

  const hub = new THREE.Mesh(hubGeometry, hubMaterial);
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI / 2;
  const deck = new THREE.Group();
  deck.rotation.x = 0.35;
  deck.add(hub, ring);
  const copies = Array.from({ length: dockCount }, (_, dockIndex) => {
    const dockAngle = (dockIndex / dockCount) * Math.PI * 2;
    const copy = new THREE.Mesh(copyGeometry, copyMaterial);
    copy.position.set(Math.cos(dockAngle) * STATION_RING_RADIUS, 0.08, Math.sin(dockAngle) * STATION_RING_RADIUS);
    copy.rotation.y = -dockAngle;
    deck.add(copy);
    return copy;
  });
  const label = createFileLabelSprite("cloud station", "node", 0.2, disposables);
  label.position.y = -0.62;
  const group = new THREE.Group();
  group.position.copy(position);
  group.add(deck, label);
  group.updateMatrixWorld(true);

  return {
    group,
    docks: copies.map((copy) => copy.getWorldPosition(new THREE.Vector3())),
    update: (copyPresence, glow, elapsedSeconds, motionScale) => {
      hub.rotation.y = elapsedSeconds * 0.4 * motionScale;
      ringMaterial.opacity = 0.3 + 0.55 * glow;
      hubMaterial.emissiveIntensity = 0.1 + 0.9 * glow;
      copies.forEach((copy, dockIndex) => {
        const presence = copyPresence[dockIndex];
        copy.visible = presence > 0.01;
        copy.scale.setScalar(Math.max(presence, 0.001));
      });
    },
  };
}
```

- [ ] **Step 3: Story world in `landingJourneyScene.ts`**

Make the file match this content (apply through edits; do not overwrite the file in one write):

```ts
import * as THREE from "three";
import gsap from "gsap";
import { SYNCED_FILES } from "../lib/syncedFiles";
import { ROCKET_STAGGER, rocketLegProgress, storyLegProgress } from "../lib/syncStoryTimeline";
import { createStarField } from "./celestialBodies";
import { ORBIT_PLANET_RADIUS } from "./fileOrbitLayout";
import { createFileSystemOrbits, type FileSystemOrbits } from "./fileSystemOrbits";
import { createGlowPlanet } from "./glowPlanet";
import { createFileLabelSprite, loadLabelFont } from "./orbitFileLabel";
import { createSceneStage, type Disposable } from "./sceneStage";
import { createSyncRockets } from "./syncRockets";
import { createCloudStation, createPassphraseKey } from "./syncStoryProps";

export type JourneyState = {
  intro: number;
  focus: number;
  focusedItemId: string | null;
  switchFromItemId: string | null;
  focusSwitch: number;
  handoff: number;
  story: number;
};

export type ScreenPoint = { x: number; y: number };

export type LandingJourneyScene = {
  state: JourneyState;
  projectItem: (itemId: string) => ScreenPoint | null;
  dispose: () => void;
};

type CameraShot = { position: THREE.Vector3; look: THREE.Vector3 };

type StoryWorldUpdate = (
  deltaSeconds: number,
  elapsedSeconds: number,
  motionScale: number,
  cameraPoint: THREE.Vector3,
) => void;

const ORBIT_SEED = 20261007;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const HERO_CENTER = new THREE.Vector3(0, 0, 0);
const MACHINE_ONE_POSITION = new THREE.Vector3(-3.6, -0.3, 0);
const STATION_POSITION = new THREE.Vector3(0.4, 1.7, -0.8);
const MACHINE_TWO_POSITION = new THREE.Vector3(4.4, -0.4, 0);
const HERO_SHOT: CameraShot = { position: new THREE.Vector3(0, 1.4, 10.5), look: new THREE.Vector3(0, 0.9, 0) };
const HERO_SHOT_ASPECT = 0.95;
const STORY_SHOTS: readonly CameraShot[] = [
  { position: new THREE.Vector3(-2.2, 1.1, 8.4), look: new THREE.Vector3(-2.4, 0.2, 0) },
  { position: new THREE.Vector3(-1, 1.6, 10.2), look: new THREE.Vector3(-1.2, 0.6, 0) },
  { position: new THREE.Vector3(0.4, 1.8, 13.6), look: new THREE.Vector3(0.4, 0.4, 0) },
];
const STORY_SHOT_ASPECTS: readonly number[] = [1.1, 1.4, 1.75];
const FOCUS_DISTANCE = 1.5;
const FOCUS_LIFT = 0.35;
const FOCUS_LOOK_SHIFT = 0.32;
const FOCUS_ARC_LIFT = 2.2;
const easeOutCubic = gsap.parseEase("power3.out");
const easeInOut = gsap.parseEase("power2.inOut");
const easeOutBack = gsap.parseEase("back.out(1.7)");
const shotMatrix = new THREE.Matrix4();
const shotQuaternion = new THREE.Quaternion();
const focusOutward = new THREE.Vector3();
const focusRight = new THREE.Vector3();
const storyFromShot = createShot();
const storyToShot = createShot();

function createShot(): CameraShot {
  return { position: new THREE.Vector3(), look: new THREE.Vector3() };
}

function fitShot(shot: CameraShot, shotAspect: number, viewAspect: number, target: CameraShot): CameraShot {
  const narrowFit = Math.max(1, shotAspect / viewAspect);
  target.look.copy(shot.look);
  target.position.copy(shot.position).sub(shot.look).multiplyScalar(narrowFit).add(shot.look);
  return target;
}

function placeCamera(camera: THREE.Camera, shot: CameraShot): void {
  camera.position.copy(shot.position);
  camera.quaternion.setFromRotationMatrix(shotMatrix.lookAt(shot.position, shot.look, WORLD_UP));
}

function blendCameraToward(camera: THREE.Camera, shot: CameraShot, blend: number, arcLift: number): void {
  shotQuaternion.setFromRotationMatrix(shotMatrix.lookAt(shot.position, shot.look, WORLD_UP));
  camera.position.lerp(shot.position, blend).addScaledVector(WORLD_UP, Math.sin(Math.PI * blend) * arcLift);
  camera.quaternion.slerp(shotQuaternion, blend);
}

function aimFocusShot(itemPoint: THREE.Vector3, planetCenter: THREE.Vector3, target: CameraShot): CameraShot {
  focusOutward.copy(itemPoint).sub(planetCenter).setY(0);
  if (focusOutward.lengthSq() < 1e-6) focusOutward.set(0, 0, 1);
  focusOutward.normalize();
  focusRight.crossVectors(WORLD_UP, focusOutward);
  target.position.copy(itemPoint).addScaledVector(focusOutward, FOCUS_DISTANCE).addScaledVector(WORLD_UP, FOCUS_LIFT);
  target.look.copy(itemPoint).addScaledVector(focusRight, FOCUS_LOOK_SHIFT);
  return target;
}

function storyShotAt(story: number, viewAspect: number, target: CameraShot): CameraShot {
  const segment = THREE.MathUtils.clamp(story - 1, 0, STORY_SHOTS.length - 1);
  const fromIndex = Math.min(Math.floor(segment), STORY_SHOTS.length - 2);
  const blend = easeInOut(segment - fromIndex);
  fitShot(STORY_SHOTS[fromIndex], STORY_SHOT_ASPECTS[fromIndex], viewAspect, storyFromShot);
  fitShot(STORY_SHOTS[fromIndex + 1], STORY_SHOT_ASPECTS[fromIndex + 1], viewAspect, storyToShot);
  target.position.lerpVectors(storyFromShot.position, storyToShot.position, blend);
  target.look.lerpVectors(storyFromShot.look, storyToShot.look, blend);
  return target;
}

function createLockRing(disposables: Disposable[]): THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial> {
  const lockGeometry = new THREE.TorusGeometry(1.3, 0.012, 8, 128);
  const lockMaterial = new THREE.MeshBasicMaterial({
    color: "#ffa366",
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  disposables.push(lockGeometry, lockMaterial);
  return new THREE.Mesh(lockGeometry, lockMaterial);
}

function createStoryWorld(
  scene: THREE.Scene,
  state: JourneyState,
  machineOne: THREE.Group,
  machineOneOrbits: FileSystemOrbits,
  disposables: Disposable[],
): StoryWorldUpdate {
  const station = createCloudStation(STATION_POSITION, SYNCED_FILES.length, disposables);
  const machineTwo = new THREE.Group();
  machineTwo.position.copy(MACHINE_TWO_POSITION);
  const machineTwoPlanet = createGlowPlanet("obsidian", disposables);
  const machineTwoOrbits = createFileSystemOrbits(SYNCED_FILES, ORBIT_SEED + 1, disposables);
  const machineTwoLabel = createFileLabelSprite("machine 02", "node", 0.22, disposables);
  machineTwoLabel.position.y = -1.45;
  machineTwo.add(machineTwoPlanet.group, machineTwoOrbits.group, machineTwoLabel);
  const machineOneLabel = createFileLabelSprite("machine 01", "node", 0.22, disposables);
  machineOneLabel.position.y = -1.45;
  const passphraseKey = createPassphraseKey(disposables);
  passphraseKey.position.y = 1.45;
  const lockRing = createLockRing(disposables);
  machineOne.add(machineOneLabel, passphraseKey, lockRing);
  const rockets = createSyncRockets(
    SYNCED_FILES,
    { machineOne: MACHINE_ONE_POSITION, machineTwo: MACHINE_TWO_POSITION, docks: station.docks },
    disposables,
  );
  scene.add(station.group, machineTwo, rockets.group);
  const copyPresence = SYNCED_FILES.map(() => 0);

  return (deltaSeconds, elapsedSeconds, motionScale, cameraPoint) => {
    const appear = THREE.MathUtils.clamp((state.handoff - 0.4) / 0.6, 0, 1);
    station.group.visible = appear > 0.01;
    machineTwo.visible = appear > 0.01;
    station.group.scale.setScalar(Math.max(appear, 0.001));
    machineTwo.scale.setScalar(Math.max(appear, 0.001));
    machineOneLabel.material.opacity = appear;
    machineTwoLabel.material.opacity = appear;
    const keyIn = THREE.MathUtils.clamp(state.story / 0.6, 0, 1);
    const keyOut = THREE.MathUtils.clamp((state.story - 2.2) / 0.5, 0, 1);
    passphraseKey.visible = keyIn > 0.001 && keyOut < 0.999;
    passphraseKey.scale.setScalar(Math.max(easeOutBack(keyIn) * (1 - keyOut), 0.001));
    passphraseKey.rotation.y = elapsedSeconds * 0.9 * motionScale;
    const lockPulse = THREE.MathUtils.clamp((state.story - 0.5) / 0.5, 0, 1);
    lockRing.material.opacity = Math.sin(Math.PI * lockPulse) * 0.8;
    lockRing.visible = lockRing.material.opacity > 0.001;
    lockRing.scale.setScalar(1 + 0.25 * lockPulse);
    const uploadLeg = storyLegProgress(state.story, 1);
    const downloadLeg = storyLegProgress(state.story, 2);
    SYNCED_FILES.forEach((_, itemIndex) => {
      const uploadFlight = rocketLegProgress(uploadLeg, itemIndex, SYNCED_FILES.length, ROCKET_STAGGER);
      const downloadFlight = rocketLegProgress(downloadLeg, itemIndex, SYNCED_FILES.length, ROCKET_STAGGER);
      machineOneOrbits.setPulse(itemIndex, Math.sin(Math.PI * THREE.MathUtils.clamp(uploadFlight / 0.25, 0, 1)));
      copyPresence[itemIndex] = THREE.MathUtils.clamp((uploadFlight - 0.92) / 0.08, 0, 1);
      machineTwoOrbits.setPresence(itemIndex, THREE.MathUtils.clamp((downloadFlight - 0.92) / 0.08, 0, 1));
    });
    station.update(copyPresence, uploadLeg, elapsedSeconds, motionScale);
    rockets.update(uploadLeg, downloadLeg, elapsedSeconds, motionScale);
    machineTwoPlanet.update(elapsedSeconds, motionScale, appear);
    machineTwoOrbits.update(deltaSeconds, motionScale, cameraPoint);
  };
}

export async function createLandingJourneyScene(
  host: HTMLElement,
  state: JourneyState,
  onItemClick: (itemId: string | null) => void,
): Promise<LandingJourneyScene | null> {
  await loadLabelFont();
  const stage = createSceneStage(host, 38);
  if (!stage) return null;
  const { scene, camera, disposables, prefersReducedMotion } = stage;

  scene.add(new THREE.AmbientLight("#ffffff", 0.35));
  const keyLight = new THREE.DirectionalLight("#fff1e0", 2.6);
  keyLight.position.set(-4, 3, 5);
  const rimLight = new THREE.DirectionalLight("#e87a2e", 3);
  rimLight.position.set(4, 1, -4);
  scene.add(keyLight, rimLight, createStarField(disposables, 1100, 30, 70));

  const machineOne = new THREE.Group();
  const machineOnePlanet = createGlowPlanet("bergamot", disposables);
  const machineOneOrbits = createFileSystemOrbits(SYNCED_FILES, ORBIT_SEED, disposables);
  const occluderGeometry = new THREE.SphereGeometry(ORBIT_PLANET_RADIUS, 24, 16);
  const occluderMaterial = new THREE.MeshBasicMaterial({ visible: false });
  disposables.push(occluderGeometry, occluderMaterial);
  const planetOccluder = new THREE.Mesh(occluderGeometry, occluderMaterial);
  machineOne.add(machineOnePlanet.group, machineOneOrbits.group, planetOccluder);
  scene.add(machineOne);
  const updateStoryWorld = createStoryWorld(scene, state, machineOne, machineOneOrbits, disposables);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pickTargets: THREE.Object3D[] = [...machineOneOrbits.pickables, planetOccluder];
  const pickingEnabled = () => state.handoff < 0.02;
  const pickItemAt = (pointerEvent: MouseEvent): string | null => {
    const bounds = host.getBoundingClientRect();
    pointer.set(
      ((pointerEvent.clientX - bounds.left) / bounds.width) * 2 - 1,
      1 - ((pointerEvent.clientY - bounds.top) / bounds.height) * 2,
    );
    raycaster.setFromCamera(pointer, camera);
    const pickedId: unknown = raycaster.intersectObjects(pickTargets, false)[0]?.object.userData.itemId;
    return typeof pickedId === "string" ? pickedId : null;
  };
  const hoverItem = (pointerEvent: PointerEvent) => {
    const hoveredId = pickingEnabled() ? pickItemAt(pointerEvent) : null;
    machineOneOrbits.setHovered(hoveredId);
    host.style.cursor = hoveredId ? "pointer" : "";
  };
  const clickItem = (clickEvent: MouseEvent) => {
    if (pickingEnabled()) onItemClick(pickItemAt(clickEvent));
  };
  host.addEventListener("pointermove", hoverItem);
  host.addEventListener("click", clickItem);
  disposables.push({
    dispose: () => {
      host.removeEventListener("pointermove", hoverItem);
      host.removeEventListener("click", clickItem);
    },
  });

  const heroShot = createShot();
  const focusShot = createShot();
  const storyShot = createShot();
  const itemPoint = new THREE.Vector3();
  const switchPoint = new THREE.Vector3();
  const projectedPoint = new THREE.Vector3();
  const focusedItemPoint = (): THREE.Vector3 | null => {
    if (!state.focusedItemId || !machineOneOrbits.itemWorldPosition(state.focusedItemId, itemPoint)) return null;
    if (!state.switchFromItemId || !machineOneOrbits.itemWorldPosition(state.switchFromItemId, switchPoint)) {
      return itemPoint;
    }
    return itemPoint.copy(switchPoint.lerp(itemPoint, easeInOut(state.focusSwitch)));
  };

  stage.start((deltaSeconds, elapsedSeconds) => {
    const motionScale = prefersReducedMotion ? 0 : 1;
    const intro = easeOutCubic(state.intro);
    const handoff = easeInOut(state.handoff);
    machineOne.scale.setScalar(0.6 + 0.4 * intro);
    machineOne.position.lerpVectors(HERO_CENTER, MACHINE_ONE_POSITION, handoff);
    machineOnePlanet.update(elapsedSeconds, motionScale, intro);
    machineOneOrbits.setFocus(state.focusedItemId, state.focus);
    machineOneOrbits.update(deltaSeconds, motionScale * Math.max(0, 1 - state.focus * 3), camera.position);
    updateStoryWorld(deltaSeconds, elapsedSeconds, motionScale, camera.position);
    placeCamera(camera, fitShot(HERO_SHOT, HERO_SHOT_ASPECT, stage.aspect(), heroShot));
    const focusPoint = focusedItemPoint();
    if (focusPoint) {
      blendCameraToward(camera, aimFocusShot(focusPoint, machineOne.position, focusShot), state.focus, FOCUS_ARC_LIFT);
    }
    if (handoff > 0) blendCameraToward(camera, storyShotAt(state.story, stage.aspect(), storyShot), handoff, 0);
  });

  return {
    state,
    projectItem: (itemId) => {
      if (!machineOneOrbits.itemWorldPosition(itemId, projectedPoint)) return null;
      projectedPoint.project(camera);
      const bounds = host.getBoundingClientRect();
      return {
        x: bounds.left + (projectedPoint.x * 0.5 + 0.5) * bounds.width,
        y: bounds.top + (0.5 - projectedPoint.y * 0.5) * bounds.height,
      };
    },
    dispose: stage.dispose,
  };
}
```

Composition note: the camera takes one pose per frame (hero, then focus blend, then story blend), so a focus that is still releasing when the handoff starts blends out without a jump.

- [ ] **Step 4: Initialize the new state fields in `LandingPage.tsx`**

In the `journeyStateRef` initializer add `handoff: 0,` and `story: 0,` after `focusSwitch: 0,`.

- [ ] **Step 5: Build, gate, file size**

Run: `npm run build -w @cursor-sync/web && node /home/marcelo/.cursor/skills/code-architecture/scripts/quality-gate.mjs && wc -l apps/web/src/scenes/landingJourneyScene.ts apps/web/src/scenes/syncStoryProps.ts apps/web/src/scenes/fileSystemOrbits.ts`
Expected: build and gate exit 0; every count at most 300.

- [ ] **Step 6: Visual check (hero regression only)**

On `http://localhost:3000` the hero must look unchanged, because `handoff` and `story` stay 0 until Task 10 drives them. Check the browser console for errors. Take one hero screenshot. Do not add temporary instrumentation to drive the story by hand; the story visuals are verified in Task 10.

- [ ] **Step 7: Checkpoint (no commit)**

Report files, exit codes, the hero screenshot, and the gap: story visuals are verified in Task 10.

---

### Task 10: Pinned journey, story overlay, clickable steps

Budget: about 140 added production lines, 3 edited files.

**Files:**
- Modify: `apps/web/src/pages/LandingPage.tsx`
- Modify: `apps/web/src/components/HowItSyncsSection.tsx`
- Modify: `apps/web/src/components/HowItSyncsSection.css`

**Interfaces:**
- Consumes: `JOURNEY_LENGTH`, `JOURNEY_SEGMENTS`, `SYNC_STEP_LABELS`, `SYNC_STEPS`, `stepIndexAtStory` (Task 7); `JourneyState.handoff / story` (Task 9).
- Produces:
  - One timeline pinned on `.journey-stage`: hero 0.4, handoff 1 (hero copy and file list fade, `handoff` 0 to 1, overlay fades in), labels `step1` at 1.4, `step2` at 2.4, `step3` at 3.4, `step4` at 4.4, tail 0.4. Total 4.8 timeline units over `4.8 * innerHeight` px, scrub 0.8.
  - `storyStepIndex: number | null` in `LandingPage` (null outside the story segment or outside the pin).
  - `scrollToStep(stepIndex: number): void` (ScrollToPlugin, `labelToScroll`, 1.4 s `power2.inOut`, `autoKill`; 0 s with reduced motion).
  - `HowItSyncsSection` props: `{ activeStepIndex: number; onStepSelect: (stepIndex: number) => void }`. It no longer mounts a scene.
  - `/#how-it-syncs` scrolls to label `step1`.

- [ ] **Step 1: Rewrite `HowItSyncsSection.tsx` as the overlay**

Make the file match:

```tsx
import { SYNC_STEPS } from "../lib/syncStoryTimeline";
import "./HowItSyncsSection.css";

type HowItSyncsSectionProps = {
  activeStepIndex: number;
  onStepSelect: (stepIndex: number) => void;
};

export function HowItSyncsSection({ activeStepIndex, onStepSelect }: HowItSyncsSectionProps) {
  return (
    <section className="sync-story" id="how-it-syncs" aria-labelledby="sync-story-title">
      <h2 id="sync-story-title" className="sync-story-title">
        How it syncs
      </h2>
      <ol className="sync-story-steps">
        {SYNC_STEPS.map((syncStep, stepIndex) => (
          <li
            key={syncStep.number}
            className={stepIndex === activeStepIndex ? "sync-story-step is-active" : "sync-story-step"}
          >
            <button
              type="button"
              className="sync-story-step-button"
              aria-current={stepIndex === activeStepIndex ? "step" : undefined}
              onClick={() => onStepSelect(stepIndex)}
            >
              <span className="sync-story-step-head">
                <span className="mono sync-story-step-number">{syncStep.number}</span>
                <span className="sync-story-step-title">{syncStep.title}</span>
              </span>
              <span className="sync-story-step-detail">{syncStep.detail}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="sync-story-footer">
        <div className="sync-story-rail" aria-hidden="true">
          {SYNC_STEPS.map((syncStep, stepIndex) => (
            <span
              key={syncStep.number}
              className={stepIndex <= activeStepIndex ? "sync-story-tick is-lit" : "sync-story-tick"}
            />
          ))}
        </div>
        <p className="sync-story-note">Nothing moves. Everything is copied. Only your passphrase opens the copies.</p>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Overlay styles in `HowItSyncsSection.css`**

Replace the `.sync-story`, `.sync-story-stage`, `.sync-story-canvas`, and `.sync-story-canvas[data-webgl="off"]` blocks with:

```css
.sync-story {
  position: absolute;
  inset: 0;
  visibility: hidden;
  pointer-events: none;
}
```

After the `.sync-story-step.is-active` block add:

```css
.sync-story-step-button {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: inherit;
  cursor: pointer;
  pointer-events: auto;
}

.sync-story-step-button:focus-visible {
  outline: 1px solid var(--color-bergamota);
  outline-offset: 6px;
}
```

In `.sync-story-step-detail`, add `display: block;` as the first declaration.
Delete the `.sync-story-telemetry` block.
Inside `@media (max-width: 720px)`, after the `.sync-story-step.is-active:nth-child(n)` block add:

```css
  .sync-story-step:not(.is-active) .sync-story-step-button {
    pointer-events: none;
  }
```

- [ ] **Step 3: Pinned journey in `LandingPage.tsx`**

Make the file match this content (edits, not a whole-file write). The journey effect is declared before the reveal effect on purpose: the maker reveal ScrollTrigger must be created after the pin so its start includes the pin spacing.

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FileFocusCard } from "../components/FileFocusCard";
import { HowItSyncsSection } from "../components/HowItSyncsSection";
import { Nav } from "../components/Nav";
import { SiteFooter } from "../components/SiteFooter";
import { EXTENSION_LISTING_URL } from "../lib/defaults";
import { SYNCED_FILES } from "../lib/syncedFiles";
import { JOURNEY_LENGTH, JOURNEY_SEGMENTS, SYNC_STEP_LABELS, stepIndexAtStory } from "../lib/syncStoryTimeline";
import { useHeroFileFocus } from "../lib/useHeroFileFocus";
import type { JourneyState, LandingJourneyScene } from "../scenes/landingJourneyScene";
import { useLazyScene, type SceneLoader } from "../scenes/useLazyScene";
import "./LandingPage.css";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const STORY_HASH = "#how-it-syncs";

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LandingPage() {
  const landingRef = useRef<HTMLDivElement>(null);
  const journeyRef = useRef<HTMLElement>(null);
  const journeyStageRef = useRef<HTMLDivElement>(null);
  const journeyHostRef = useRef<HTMLDivElement>(null);
  const focusCardRef = useRef<HTMLElement>(null);
  const journeyTriggerRef = useRef<ScrollTrigger | null>(null);
  const stepScrollRef = useRef<gsap.core.Tween | null>(null);
  const journeyStateRef = useRef<JourneyState>({
    intro: 0,
    focus: 0,
    focusedItemId: null,
    switchFromItemId: null,
    focusSwitch: 0,
    handoff: 0,
    story: 0,
  });
  const openItemRef = useRef<(itemId: string | null, opener: HTMLElement | null) => void>(() => undefined);
  const [storyStepIndex, setStoryStepIndex] = useState<number | null>(null);
  const loadJourney = useCallback<SceneLoader<LandingJourneyScene>>(
    (host) =>
      import("../scenes/landingJourneyScene").then(({ createLandingJourneyScene }) =>
        createLandingJourneyScene(host, journeyStateRef.current, (itemId) => openItemRef.current(itemId, null)),
      ),
    [],
  );
  const journeyScene = useLazyScene(journeyHostRef, loadJourney);
  const heroFocus = useHeroFileFocus(journeyStateRef, journeyScene, focusCardRef);
  const focusedFile = SYNCED_FILES.find((syncedFile) => syncedFile.id === heroFocus.focusedItemId);
  const { hash } = useLocation();

  const scrollToStep = useCallback((stepIndex: number) => {
    const journeyTrigger = journeyTriggerRef.current;
    if (!journeyTrigger) return;
    stepScrollRef.current?.kill();
    stepScrollRef.current = gsap.to(window, {
      scrollTo: { y: journeyTrigger.labelToScroll(SYNC_STEP_LABELS[stepIndex]), autoKill: true },
      duration: prefersReducedMotion() ? 0 : 1.4,
      ease: "power2.inOut",
    });
  }, []);

  useEffect(() => {
    openItemRef.current = heroFocus.openItem;
  }, [heroFocus.openItem]);

  useEffect(() => {
    const journey = journeyRef.current;
    const journeyStage = journeyStageRef.current;
    if (!journey || !journeyStage) return;
    const journeyState = journeyStateRef.current;
    let pinActive = false;
    const syncStoryStep = () => {
      setStoryStepIndex(pinActive && journeyState.handoff >= 0.999 ? stepIndexAtStory(journeyState.story) : null);
    };
    const journeyContext = gsap.context(() => {
      const handoffEnd = JOURNEY_SEGMENTS.hero + JOURNEY_SEGMENTS.handoff;
      const journeyTimeline = gsap.timeline({
        defaults: { ease: "none" },
        onUpdate: syncStoryStep,
        scrollTrigger: {
          trigger: journey,
          start: "top top",
          end: () => `+=${window.innerHeight * JOURNEY_LENGTH}`,
          pin: journeyStage,
          scrub: 0.8,
          invalidateOnRefresh: true,
          onToggle: (journeyTrigger) => {
            pinActive = journeyTrigger.isActive;
            syncStoryStep();
          },
        },
      });
      journeyTimeline
        .to(".hero-copy", { autoAlpha: 0, y: -40, duration: 0.5 }, JOURNEY_SEGMENTS.hero)
        .to(".hero-file-list", { autoAlpha: 0, duration: 0.3 }, JOURNEY_SEGMENTS.hero)
        .to(journeyState, { handoff: 1, duration: JOURNEY_SEGMENTS.handoff }, JOURNEY_SEGMENTS.hero)
        .fromTo(".sync-story", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, handoffEnd - 0.4)
        .addLabel(SYNC_STEP_LABELS[0], handoffEnd)
        .to(journeyState, { story: 1, duration: JOURNEY_SEGMENTS.step }, handoffEnd)
        .addLabel(SYNC_STEP_LABELS[1])
        .to(journeyState, { story: 2, duration: JOURNEY_SEGMENTS.step })
        .addLabel(SYNC_STEP_LABELS[2])
        .to(journeyState, { story: 3, duration: JOURNEY_SEGMENTS.step })
        .addLabel(SYNC_STEP_LABELS[3])
        .to({}, { duration: JOURNEY_SEGMENTS.tail });
      journeyTriggerRef.current = journeyTimeline.scrollTrigger ?? null;
    }, journey);
    return () => {
      journeyTriggerRef.current = null;
      journeyContext.revert();
    };
  }, []);

  useEffect(() => {
    const landing = landingRef.current;
    if (!landing) return;
    const revealContext = gsap.context(() => {
      gsap.from(".hero-reveal", { y: 18, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.08, delay: 0.1 });
      gsap.from(".maker > *", {
        y: 20,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: ".maker", start: "top 80%" },
      });
    }, landing);
    return () => revealContext.revert();
  }, []);

  useEffect(() => {
    if (!journeyScene) return;
    const journeyState = journeyScene.state;
    if (prefersReducedMotion()) {
      journeyState.intro = 1;
      return;
    }
    const introTween = gsap.to(journeyState, { intro: 1, duration: 2.4, ease: "expo.out", delay: 0.15 });
    return () => {
      introTween.kill();
    };
  }, [journeyScene]);

  useEffect(() => {
    if (hash === STORY_HASH) scrollToStep(0);
  }, [hash, scrollToStep]);

  useEffect(
    () => () => {
      stepScrollRef.current?.kill();
    },
    [],
  );

  return (
    <div ref={landingRef} className="landing" data-page="landing">
      <Nav />
      <main>
        <section ref={journeyRef} className="journey" aria-labelledby="hero-title">
          <div ref={journeyStageRef} className="journey-stage">
            <div className="hero-backlight" aria-hidden="true" />
            <div ref={journeyHostRef} className="journey-canvas" aria-hidden="true" />
            <div className="hero-copy">
              <h1 id="hero-title" className="hero-title hero-reveal">
                Your Cursor setup, in orbit.
              </h1>
              <p className="hero-sub hero-reveal">Settings, rules, and skills follow you to every computer.</p>
              <div className="hero-actions hero-reveal">
                <a className="hero-action hero-action--primary" href={EXTENSION_LISTING_URL} target="_blank" rel="noreferrer">
                  Install
                </a>
                <Link className="hero-action hero-action--secondary" to="/sign-in">
                  Sign in
                </Link>
              </div>
            </div>
            <ul className="hero-file-list" aria-label="Files that sync">
              {SYNCED_FILES.map((syncedFile) => (
                <li key={syncedFile.id}>
                  <button
                    type="button"
                    className="hero-file-button mono"
                    onClick={(clickEvent) => heroFocus.openItem(syncedFile.id, clickEvent.currentTarget)}
                  >
                    {syncedFile.label}
                  </button>
                </li>
              ))}
            </ul>
            {focusedFile ? (
              <FileFocusCard
                cardRef={focusCardRef}
                syncedFile={focusedFile}
                centered={!journeyScene}
                onClose={heroFocus.closeItem}
                onStep={heroFocus.stepItem}
              />
            ) : null}
            <HowItSyncsSection activeStepIndex={storyStepIndex ?? 0} onStepSelect={scrollToStep} />
          </div>
        </section>

        <section className="maker" aria-labelledby="maker-name">
          <div className="maker-avatar" aria-hidden="true">
            MB
          </div>
          <h2 id="maker-name" className="maker-name">
            Marcelo Barella
          </h2>
          <p className="mono maker-role">A young SpaceXAI Ambassador.</p>
          <p className="maker-bio">
            He builds Cursor Sync so a setup can travel without handing the keys to the server. Everything is
            client-side encrypted before bytes leave your device.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
```

- [ ] **Step 4: Build and dead-reference check**

Run: `npm run build -w @cursor-sync/web && rg -n "planetOrbitScene|sync-story-canvas|sync-story-telemetry" apps/web/src/components apps/web/src/pages`
Expected: build exit 0; `rg` prints nothing.

- [ ] **Step 5: Visual check (driven path, one screenshot each)**

On `http://localhost:3000` at 1440x900:
1. Hero at rest.
2. Mid-handoff (about 0.9 viewport down): hero copy fading up, planet gliding left, station and machine 02 fading in, no hover cursor on items.
3. Step 01 (click "01 Install" or open `/#how-it-syncs`): machine 01 framed with ten items, "machine 01" label.
4. Step 02: passphrase key above machine 01; the lock ring pulsed once while scrolling into it.
5. Step 03: during the scroll from 02 to 03, ten labelled rockets leave machine 01 with a stagger and trails; originals pulse and stay in orbit; at 03 the station glows with a ring of copies.
6. Step 04: rockets fly from the station to machine 02; at 04 both planets show the same ten items.
7. Scroll backward from 04 to 02: rockets reverse cleanly; copies disappear from machine 02 and the station.
8. Click "02 Secret word" while at 04: the page scrolls to step 02 in about 1.4 s.
9. Scroll past the pin: the maker section and footer follow normally; the maker reveal plays when it enters.
10. Repeat 1 and 3 at 390x844 (narrow fit keeps all bodies in frame).

- [ ] **Step 6: Checkpoint (no commit)**

Report files, exit codes, screenshots, and any framing values you had to tune (shot positions in `landingJourneyScene.ts`).

---

### Task 11: Story autoplay and play/pause

Budget: about 110 added production lines, 1 new production file, 3 edited files.

**Files:**
- Create: `apps/web/src/lib/useStoryAutoplay.ts`
- Modify: `apps/web/src/pages/LandingPage.tsx`
- Modify: `apps/web/src/components/HowItSyncsSection.tsx`
- Modify: `apps/web/src/components/HowItSyncsSection.css`

**Interfaces:**
- Consumes: `nextAutoplayStatus`, `AutoplayStatus`, `AutoplayEvent`, `SYNC_STEPS` (Task 7); `storyStepIndex`, `scrollToStep` (Task 10).
- Produces:
  - `type StoryAutoplay = { status: AutoplayStatus; toggle: () => void; selectStep: (stepIndex: number) => void }`; `const AUTOPLAY_CONTROL_SELECTOR = "[data-autoplay-control]"`; `useStoryAutoplay(storyStepIndex: number | null, scrollToStep: (stepIndex: number, onInterrupted: (() => void) | null) => void): StoryAutoplay`. `selectStep` stops autoplay (`step-selected`) and scrolls to the step.
  - Timers: quiet 2000 ms before `playing`; hold 5000 ms per step; stop after step 04.
  - `scrollToStep` gains `onInterrupted: (() => void) | null`, wired to ScrollTo `onAutoKill`.
  - `HowItSyncsSection` gains `autoplayStatus: AutoplayStatus` and `onAutoplayToggle: () => void`.

- [ ] **Step 1: Create the hook**

Create `apps/web/src/lib/useStoryAutoplay.ts`:

```ts
import { useCallback, useEffect, useState } from "react";
import { SYNC_STEPS, nextAutoplayStatus, type AutoplayEvent, type AutoplayStatus } from "./syncStoryTimeline";

export type StoryAutoplay = {
  status: AutoplayStatus;
  toggle: () => void;
  selectStep: (stepIndex: number) => void;
};

export const AUTOPLAY_CONTROL_SELECTOR = "[data-autoplay-control]";

const QUIET_MILLISECONDS = 2000;
const STEP_HOLD_MILLISECONDS = 5000;
const USER_INPUT_EVENTS = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useStoryAutoplay(
  storyStepIndex: number | null,
  scrollToStep: (stepIndex: number, onInterrupted: (() => void) | null) => void,
): StoryAutoplay {
  const [status, setStatus] = useState<AutoplayStatus>("idle");
  const dispatch = useCallback((event: AutoplayEvent) => {
    setStatus((currentStatus) => nextAutoplayStatus(currentStatus, event));
  }, []);
  const storyActive = storyStepIndex !== null;

  useEffect(() => {
    dispatch(storyActive ? "story-entered" : "story-left");
  }, [storyActive, dispatch]);

  useEffect(() => {
    const stopOnUserInput = (inputEvent: Event) => {
      if (inputEvent.target instanceof Element && inputEvent.target.closest(AUTOPLAY_CONTROL_SELECTOR)) return;
      dispatch("user-input");
    };
    const pauseWhenHidden = () => {
      if (document.hidden) dispatch("tab-hidden");
    };
    USER_INPUT_EVENTS.forEach((eventName) => window.addEventListener(eventName, stopOnUserInput, { passive: true }));
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => {
      USER_INPUT_EVENTS.forEach((eventName) => window.removeEventListener(eventName, stopOnUserInput));
      document.removeEventListener("visibilitychange", pauseWhenHidden);
    };
  }, [dispatch]);

  useEffect(() => {
    if (status !== "waiting" || prefersReducedMotion()) return;
    let quietTimer = window.setTimeout(() => dispatch("quiet-elapsed"), QUIET_MILLISECONDS);
    const restartQuietTimer = () => {
      window.clearTimeout(quietTimer);
      quietTimer = window.setTimeout(() => dispatch("quiet-elapsed"), QUIET_MILLISECONDS);
    };
    window.addEventListener("scroll", restartQuietTimer, { passive: true });
    return () => {
      window.clearTimeout(quietTimer);
      window.removeEventListener("scroll", restartQuietTimer);
    };
  }, [status, dispatch]);

  useEffect(() => {
    if (status !== "playing" || storyStepIndex === null) return;
    const holdTimer = window.setTimeout(() => {
      if (storyStepIndex >= SYNC_STEPS.length - 1) {
        dispatch("last-step-held");
        return;
      }
      scrollToStep(storyStepIndex + 1, () => dispatch("scroll-killed"));
    }, STEP_HOLD_MILLISECONDS);
    return () => window.clearTimeout(holdTimer);
  }, [status, storyStepIndex, scrollToStep, dispatch]);

  const toggle = useCallback(() => dispatch("toggle"), [dispatch]);
  const selectStep = useCallback(
    (stepIndex: number) => {
      dispatch("step-selected");
      scrollToStep(stepIndex, null);
    },
    [dispatch, scrollToStep],
  );
  return { status, toggle, selectStep };
}
```

- [ ] **Step 2: Wire it in `LandingPage.tsx`**

Add `import { useStoryAutoplay } from "../lib/useStoryAutoplay";` after the `useHeroFileFocus` import.

Replace the `scrollToStep` callback with:

```tsx
  const scrollToStep = useCallback((stepIndex: number, onInterrupted: (() => void) | null) => {
    const journeyTrigger = journeyTriggerRef.current;
    if (!journeyTrigger) return;
    stepScrollRef.current?.kill();
    stepScrollRef.current = gsap.to(window, {
      scrollTo: {
        y: journeyTrigger.labelToScroll(SYNC_STEP_LABELS[stepIndex]),
        autoKill: true,
        onAutoKill: onInterrupted ?? undefined,
      },
      duration: prefersReducedMotion() ? 0 : 1.4,
      ease: "power2.inOut",
    });
  }, []);
  const storyAutoplay = useStoryAutoplay(storyStepIndex, scrollToStep);
```

Replace the hash effect body line with `if (hash === STORY_HASH) scrollToStep(0, null);`.

Replace the `<HowItSyncsSection ... />` element with:

```tsx
            <HowItSyncsSection
              activeStepIndex={storyStepIndex ?? 0}
              onStepSelect={storyAutoplay.selectStep}
              autoplayStatus={storyAutoplay.status}
              onAutoplayToggle={storyAutoplay.toggle}
            />
```

- [ ] **Step 3: Play/pause in `HowItSyncsSection.tsx`**

Add `import type { AutoplayStatus } from "../lib/syncStoryTimeline";` (keep the `SYNC_STEPS` import).

Replace the props type with:

```tsx
type HowItSyncsSectionProps = {
  activeStepIndex: number;
  onStepSelect: (stepIndex: number) => void;
  autoplayStatus: AutoplayStatus;
  onAutoplayToggle: () => void;
};
```

Update the destructuring to `{ activeStepIndex, onStepSelect, autoplayStatus, onAutoplayToggle }`.

Wrap the rail in a controls row: replace the `<div className="sync-story-rail" aria-hidden="true"> ... </div>` element with:

```tsx
        <div className="sync-story-controls">
          <div className="sync-story-rail" aria-hidden="true">
            {SYNC_STEPS.map((syncStep, stepIndex) => (
              <span
                key={syncStep.number}
                className={stepIndex <= activeStepIndex ? "sync-story-tick is-lit" : "sync-story-tick"}
              />
            ))}
          </div>
          <button type="button" className="mono sync-story-play" data-autoplay-control="" onClick={onAutoplayToggle}>
            {autoplayStatus === "playing" ? "Pause" : "Play"}
          </button>
        </div>
```

The `data-autoplay-control` attribute must match `AUTOPLAY_CONTROL_SELECTOR` in `useStoryAutoplay.ts`.

- [ ] **Step 4: Control styles in `HowItSyncsSection.css`**

In `.sync-story-rail`, change `margin: 0 auto var(--space-2);` to `margin: 0;`. After the `.sync-story-tick.is-lit` block add:

```css
.sync-story-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.sync-story-play {
  padding: 4px 10px;
  border: 1px solid rgba(68, 71, 74, 0.6);
  border-radius: var(--radius-control);
  background: var(--color-panel);
  color: var(--color-ink);
  cursor: pointer;
  pointer-events: auto;
}
```

- [ ] **Step 5: Tests, build, gate**

Run: `npm test -w @cursor-sync/web && npm run build -w @cursor-sync/web && node /home/marcelo/.cursor/skills/code-architecture/scripts/quality-gate.mjs`
Expected: 8 files pass; build and gate exit 0. The transitions are covered by the Task 7 reducer tests; this step proves the wiring compiles.

- [ ] **Step 6: Visual check (driven path)**

1. Scroll into step 01 and stop. After 2 s the button reads "Pause" and the page scrolls to 02; it holds about 5 s, then 03, then 04, and stops at 04 (button reads "Play").
2. Restart: scroll back to 01, wait 2 s for autoplay, then use the mouse wheel once: autoplay stops (button "Play") and does not restart while you stay in the story.
3. Click "Play": autoplay resumes from the current step. Click "Pause": it stops.
4. While playing, switch to another tab for 10 s and come back: it resumes after 2 s quiet.
5. Scroll above the story and back in: autoplay waits again (reset to idle on leave).
6. In the story, wait for autoplay, then click "03 Copy up": autoplay stops and the page scrolls to 03; no autoplay starts afterwards while you stay in the story.
7. With reduced motion emulated: autoplay never starts by itself; step clicks jump without smooth scroll.

- [ ] **Step 7: Checkpoint (no commit)**

Report files, exit codes, and the observed autoplay sequence.

---

### Task 12: Auth orbit scene

Budget: about 90 added production lines (plus about 45 deleted), 1 new production file, 2 edited files.

**Files:**
- Create: `apps/web/src/scenes/authOrbitScene.ts`
- Modify: `apps/web/src/components/AuthLayout.tsx`
- Modify: `apps/web/src/components/AuthLayout.css`

**Interfaces:**
- Consumes: `createGlowPlanet` (Task 3), `createFileSystemOrbits` (Task 2), `SYNCED_FILES` (Task 1).
- Produces: `type AuthOrbitState = { intro: number; expand: number }`; `type AuthOrbitScene = { state: AuthOrbitState; dispose: () => void }`; `createAuthOrbitScene(host: HTMLElement, state: AuthOrbitState): Promise<AuthOrbitScene | null>`. `expand` 0 to 1 scales the system up 20 percent, widens the orbits 25 percent, shifts the halo from cyan to bergamot, and pulses the halo once.

- [ ] **Step 1: Create the scene**

Create `apps/web/src/scenes/authOrbitScene.ts`:

```ts
import * as THREE from "three";
import gsap from "gsap";
import { SYNCED_FILES } from "../lib/syncedFiles";
import { createStarField } from "./celestialBodies";
import { createFileSystemOrbits } from "./fileSystemOrbits";
import { createGlowPlanet } from "./glowPlanet";
import { loadLabelFont } from "./orbitFileLabel";
import { createSceneStage } from "./sceneStage";

export type AuthOrbitState = {
  intro: number;
  expand: number;
};

export type AuthOrbitScene = {
  state: AuthOrbitState;
  dispose: () => void;
};

const ORBIT_SEED = 20261008;
const CYAN_HALO = new THREE.Color("#06b6d4");
const BERGAMOT_HALO = new THREE.Color("#e87a2e");
const CAMERA_POSITION = new THREE.Vector3(0, 1.2, 11);
const CAMERA_LOOK = new THREE.Vector3(0, 0, 0);
const easeOutCubic = gsap.parseEase("power3.out");
const easeInOut = gsap.parseEase("power2.inOut");

export async function createAuthOrbitScene(host: HTMLElement, state: AuthOrbitState): Promise<AuthOrbitScene | null> {
  await loadLabelFont();
  const stage = createSceneStage(host, 38);
  if (!stage) return null;
  const { scene, camera, disposables, prefersReducedMotion } = stage;

  scene.add(new THREE.AmbientLight("#ffffff", 0.35));
  const keyLight = new THREE.DirectionalLight("#fff1e0", 2.6);
  keyLight.position.set(-4, 3, 5);
  const rimLight = new THREE.DirectionalLight("#06b6d4", 3);
  rimLight.position.set(4, 1, -4);
  scene.add(keyLight, rimLight, createStarField(disposables, 700, 26, 60));

  const orbitSystem = new THREE.Group();
  const planet = createGlowPlanet("obsidian", disposables);
  const orbits = createFileSystemOrbits(SYNCED_FILES, ORBIT_SEED, disposables);
  orbitSystem.add(planet.group, orbits.group);
  scene.add(orbitSystem);
  camera.position.copy(CAMERA_POSITION);
  camera.lookAt(CAMERA_LOOK);

  stage.start((deltaSeconds, elapsedSeconds) => {
    const motionScale = prefersReducedMotion ? 0 : 1;
    const intro = easeOutCubic(state.intro);
    const expand = easeInOut(state.expand);
    orbitSystem.scale.setScalar((0.6 + 0.4 * intro) * (1 + 0.2 * expand));
    orbits.group.scale.setScalar(1 + 0.25 * expand);
    planet.haloColor.copy(CYAN_HALO).lerp(BERGAMOT_HALO, expand);
    planet.update(elapsedSeconds, motionScale, intro * (1 + 0.8 * Math.sin(Math.PI * state.expand)));
    orbits.update(deltaSeconds, motionScale, camera.position);
  });

  return { state, dispose: stage.dispose };
}
```

- [ ] **Step 2: Swap the scene in `AuthLayout.tsx`**

Replace the `planetOrbitScene` type import with `import type { AuthOrbitScene } from "../scenes/authOrbitScene";`.
Replace `SIGN_IN_ORBIT_FILES` and `loadSignInOrbit` with:

```tsx
const loadAuthOrbit: SceneLoader<AuthOrbitScene> = (host) =>
  import("../scenes/authOrbitScene").then(({ createAuthOrbitScene }) =>
    createAuthOrbitScene(host, { intro: 0, expand: 0 }),
  );
```

Replace `const signInOrbit = useLazyScene(orbitRef, loadSignInOrbit);` with `const authOrbit = useLazyScene(orbitRef, loadAuthOrbit);`.

Replace the intro effect with:

```tsx
  useEffect(() => {
    if (!authOrbit) return;
    const orbitState = authOrbit.state;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      orbitState.intro = 1;
      return;
    }
    const orbitIntro = gsap.to(orbitState, { intro: 1, duration: 2, ease: "expo.out" });
    return () => {
      orbitIntro.kill();
    };
  }, [authOrbit]);
```

Delete the whole `<div className="auth-terminal mono"> ... </div>` element.

- [ ] **Step 3: Remove terminal styles**

In `AuthLayout.css`, delete the `.auth-terminal`, `.auth-terminal p`, `.auth-terminal b`, `.auth-terminal-lights`, `.auth-terminal-lights i`, and `.auth-terminal-lights i:first-child` blocks, and the `.auth-terminal { display: none; }` rule inside `@media (max-width: 820px)`.

- [ ] **Step 4: Build, gate, dead names**

Run: `npm run build -w @cursor-sync/web && node /home/marcelo/.cursor/skills/code-architecture/scripts/quality-gate.mjs && rg -n "auth-terminal|planetOrbitScene" apps/web/src/components`
Expected: build and gate exit 0; `rg` prints nothing.

- [ ] **Step 5: Visual check (driven path)**

Open `/sign-in`, `/sign-up`, and `/auth/continue`: the left panel shows the obsidian planet with ten labelled items spinning, no terminal card, no hover cursor on items. Screenshot `/sign-in` desktop and 390 px wide.

- [ ] **Step 6: Checkpoint (no commit)**

Report files, exit codes, screenshots.

---

### Task 13: Connected success flow

Budget: about 120 added production lines, 3 edited files.

**Files:**
- Modify: `apps/web/src/components/AuthLayout.tsx`
- Modify: `apps/web/src/components/AuthLayout.css`
- Modify: `apps/web/src/pages/AuthForm.tsx`

**Interfaces:**
- Consumes: `AuthOrbitScene.state.expand` (Task 12); `Flip` from `gsap/Flip`.
- Produces:
  - `AuthLayout` prop `connectedPanel?: ReactNode`. When it becomes non-empty: with motion and WebGL on, the form card fades out (0.35 s), the visual panel moves from the left column to the center through `Flip.from` (1.1 s), `expand` tweens 0 to 1 (1.4 s), and the panel fades in over the planet after 0.8 s. With reduced motion or `data-webgl="off"`, the panel replaces the card content directly.
  - `AuthForm` keeps the form on error; on success it saves the token as before and shows the panel. `Continue in Cursor` navigates to the existing `continuePath` with `replace: true`.

- [ ] **Step 1: Expansion in `AuthLayout.tsx`**

Make the file match this content (through edits):

```tsx
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { LATEST_RELEASE_VERSION } from "../lib/changelogReleases";
import type { AuthOrbitScene } from "../scenes/authOrbitScene";
import { useLazyScene, type SceneLoader } from "../scenes/useLazyScene";
import { Mark } from "./Mark";
import "./AuthLayout.css";

gsap.registerPlugin(Flip);

const loadAuthOrbit: SceneLoader<AuthOrbitScene> = (host) =>
  import("../scenes/authOrbitScene").then(({ createAuthOrbitScene }) =>
    createAuthOrbitScene(host, { intro: 0, expand: 0 }),
  );

type AuthLayoutProps = {
  children: ReactNode;
  page: "sign-in" | "sign-up" | "continue" | "callback" | "verify";
  showMarkInCard?: boolean;
  connectedPanel?: ReactNode;
};

type ConnectedLayout = "form" | "expanded" | "inline";

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AuthLayout({ children, page, showMarkInCard = false, connectedPanel }: AuthLayoutProps) {
  const orbitRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const connectedRef = useRef<HTMLDivElement>(null);
  const flipStateRef = useRef<ReturnType<typeof Flip.getState> | null>(null);
  const [connectedLayout, setConnectedLayout] = useState<ConnectedLayout>("form");
  const authOrbit = useLazyScene(orbitRef, loadAuthOrbit);

  useEffect(() => {
    if (!authOrbit) return;
    const orbitState = authOrbit.state;
    if (prefersReducedMotion()) {
      orbitState.intro = 1;
      return;
    }
    const orbitIntro = gsap.to(orbitState, { intro: 1, duration: 2, ease: "expo.out" });
    return () => {
      orbitIntro.kill();
    };
  }, [authOrbit]);

  useEffect(() => {
    if (!connectedPanel || connectedLayout !== "form") return;
    const visual = visualRef.current;
    const card = cardRef.current;
    if (!visual || !card || prefersReducedMotion() || orbitRef.current?.dataset.webgl === "off") {
      setConnectedLayout("inline");
      return;
    }
    const cardFade = gsap.to(card, {
      autoAlpha: 0,
      duration: 0.35,
      ease: "power2.in",
      onComplete: () => {
        flipStateRef.current = Flip.getState(visual);
        setConnectedLayout("expanded");
      },
    });
    return () => {
      cardFade.kill();
    };
  }, [connectedPanel, connectedLayout]);

  useLayoutEffect(() => {
    const flipState = flipStateRef.current;
    if (connectedLayout !== "expanded" || !flipState) return;
    flipStateRef.current = null;
    const visualFlip = Flip.from(flipState, { duration: 1.1, ease: "power3.inOut" });
    const panelReveal = gsap.fromTo(
      connectedRef.current,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.6, delay: 0.8, ease: "power2.out" },
    );
    return () => {
      visualFlip.progress(1).kill();
      panelReveal.progress(1).kill();
    };
  }, [connectedLayout]);

  useEffect(() => {
    if (connectedLayout !== "expanded" || !authOrbit) return;
    const expandTween = gsap.to(authOrbit.state, { expand: 1, duration: 1.4, ease: "none" });
    return () => {
      expandTween.kill();
    };
  }, [connectedLayout, authOrbit]);

  return (
    <div className="auth-page" data-page={page}>
      <header className="auth-header">
        <div className="auth-header-start">
          <Link to="/" className="auth-header-brand" aria-label="Cursor Sync home">
            <span className="auth-header-dot" aria-hidden="true" />
            <span>Cursor Sync</span>
          </Link>
          <span className="auth-header-version mono">v{LATEST_RELEASE_VERSION}</span>
        </div>
        <Link to="/" className="auth-header-back">
          Back
        </Link>
      </header>
      <main className={connectedLayout === "expanded" ? "auth-main is-connected" : "auth-main"}>
        <div ref={visualRef} className="auth-visual" aria-hidden="true">
          <div className="auth-visual-ring" />
          <div ref={orbitRef} className="auth-orbit" />
        </div>
        <div ref={cardRef} className="auth-card">
          {showMarkInCard ? (
            <div className="auth-card-mark">
              <Mark size="md" />
            </div>
          ) : null}
          {connectedLayout === "inline" ? connectedPanel : children}
        </div>
        {connectedLayout === "expanded" ? (
          <div ref={connectedRef} className="auth-connected">
            {connectedPanel}
          </div>
        ) : null}
      </main>
      <footer className="auth-footer mono">
        <span>© Cursor Sync. Zero-Knowledge Cryptographic Storage Engine.</span>
        <span className="auth-footer-detail">
          <i aria-hidden="true" /> Encrypted on device
        </span>
      </footer>
    </div>
  );
}
```

The panel reveal animates `opacity`, not `autoAlpha`, so the `autoFocus` on the Continue button keeps focus while the panel fades in. Cleanups jump tweens to their end (`progress(1)`) so a StrictMode double effect never leaves the visual stuck in its start pose.

- [ ] **Step 2: Connected styles in `AuthLayout.css`**

Before `@media (max-width: 820px)`, add:

```css
.auth-main.is-connected {
  grid-template-columns: minmax(0, 1fr);
}

.auth-main.is-connected .auth-card {
  display: none;
}

.auth-main.is-connected .auth-visual,
.auth-connected {
  grid-area: 1 / 1;
}

.auth-main.is-connected .auth-visual {
  max-width: 620px;
}

.auth-connected {
  z-index: 1;
  align-self: end;
  justify-self: center;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: min(440px, 100%);
  margin-bottom: 4%;
  padding: var(--space-3);
  border: 1px solid rgba(68, 71, 74, 0.6);
  border-radius: var(--radius-card);
  background: rgba(14, 14, 16, 0.9);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7);
}

.auth-connected-warning {
  margin: 0;
  padding: 10px 12px;
  border-left: 2px solid var(--color-flame);
  background: rgba(249, 115, 22, 0.08);
  color: var(--color-ink);
  font-size: 13px;
  line-height: 1.55;
}
```

- [ ] **Step 3: Connected view in `AuthForm.tsx`**

After the `AuthFormProps` type add:

```tsx
type AuthFormView = "form" | "connected";
```

After `const [oauthError, setOauthError] = useState<string | null>(null);` add:

```tsx
  const [view, setView] = useState<AuthFormView>("form");
```

In `handleSubmit`, replace `navigate(continuePath, { replace: true });` with `setView("connected");`.

After `handleReturnToCursor`, add:

```tsx
  function continueInCursor() {
    navigate(continuePath, { replace: true });
  }
```

After the `submitLabel` constant (before the main `return (`), add:

```tsx
  const connectedPanel =
    view === "connected" ? (
      <>
        <div className="auth-card-header">
          <h2 className="auth-card-title">You're connected.</h2>
          <p className="auth-card-sub">
            Your recovery key appears once, in the Cursor Sync extension, right after you continue.
          </p>
        </div>
        <p className="auth-connected-warning">
          Save it somewhere safe, like a password manager. This is the only time it is shown. If you lose it,
          you'll need to restart syncing, and some files may be missing afterwards.
        </p>
        <Button type="button" variant="primary" fullWidth autoFocus onClick={continueInCursor}>
          Continue in Cursor
        </Button>
      </>
    ) : undefined;
```

Replace `<AuthLayout page={page}>` in the main form render (not the `oauthError` branch) with `<AuthLayout page={page} connectedPanel={connectedPanel}>`.

- [ ] **Step 4: Tests, build, file size**

Run: `npm test -w @cursor-sync/web && npm run build -w @cursor-sync/web && wc -l apps/web/src/pages/AuthForm.tsx apps/web/src/components/AuthLayout.tsx`
Expected: tests pass (the auth unit tests in `lib/` are unchanged), build exit 0, both files at most 300 lines.

- [ ] **Step 5: Driven path against the local API**

Start the API (`docker compose up --build`, API on `http://localhost:8100`, `VITE_API_URL=http://localhost:8100` in `.env`) and `npm run dev:web`.
1. `/sign-up`: create an account. Expected: the form card fades, the planet panel moves to the center and grows, the halo pulses once and turns bergamot, then the panel shows "You're connected.", the recovery-key line, the warning, and "Continue in Cursor" with keyboard focus. No auto-redirect. Screenshot.
2. Click "Continue in Cursor": the URL becomes `/auth/continue` (plus the OAuth query when present).
3. `/sign-in` with a wrong password: the form stays and shows the existing error. Screenshot.
4. `/sign-in` with the right password: same expansion as step 1.
5. Reduced motion emulated: sign in; the panel replaces the card content in place with no expansion.

If the local API is not running, report the success path as an unverified gap and verify only step 3 and the reduced-motion layout by inspection.

- [ ] **Step 6: Checkpoint (no commit)**

Report files, exit codes, screenshots, and whether the API path ran.

---

### Task 14: Cleanup, rule update, full verification

Budget: about 25 added lines (rule text), about 230 deleted lines, 1 deleted file, 3 edited files.

**Files:**
- Delete: `apps/web/src/scenes/planetOrbitScene.ts`
- Modify: `apps/web/src/scenes/syncStoryProps.ts`
- Modify: `apps/web/src/scenes/orbitFileLabel.ts`
- Modify: `.cursor/rules/threejs-scenes.mdc`

**Interfaces:**
- Consumes: everything above.
- Produces: no import of `planetOrbitScene`, `createSyncRelay`, or the `sealed` label tone remains.

- [ ] **Step 1: Prove the old scene is unused, then delete it**

Run: `rg -n "planetOrbitScene|OrbitStory|PlanetOrbitScene" apps/web/src --glob '!**/planetOrbitScene.ts'`
Expected: no output. Then delete `apps/web/src/scenes/planetOrbitScene.ts`.

- [ ] **Step 2: Prune `syncStoryProps.ts`**

Delete the `SyncRelay` type; the constants `R2_POSITION`, `PEER_POSITION`, `PEER_ORBIT_RADIUS`, `UPLOAD_ARC_LIFT`, `DOWNLOAD_ARC_LIFT`, `easeInOut`, `easeOutBack`; and the functions `quadraticPoint`, `createR2Bucket`, `createPeerMachine`, `createSyncRelay`. Delete the now-unused `gsap` import and the `celestialBodies` import. The file keeps `import * as THREE from "three";`, `import type { Disposable } from "./sceneStage";`, `import { createFileLabelSprite } from "./orbitFileLabel";`, the `CloudStation` type, `STATION_RING_RADIUS`, `createPassphraseKey`, and `createCloudStation`.

- [ ] **Step 3: Drop the `sealed` label tone**

Run `rg -n '"sealed"|sealed:' apps/web/src` and expect hits only in `orbitFileLabel.ts`. Change `export type FileLabelTone = "plain" | "sealed" | "node";` to `export type FileLabelTone = "plain" | "node";` and delete the `sealed: { ... },` entry from `LABEL_TONES`.

- [ ] **Step 4: Update `.cursor/rules/threejs-scenes.mdc`**

Change the `globs:` line to:

```text
globs: apps/web/src/scenes/**,apps/web/src/components/HowItSyncsSection.tsx,apps/web/src/components/AuthLayout.tsx,apps/web/src/components/FileFocusCard.tsx,apps/web/src/pages/LandingPage.tsx,apps/web/src/pages/ChangelogPage.tsx,apps/web/src/lib/useHeroFileFocus.ts,apps/web/src/lib/useStoryAutoplay.ts
```

In the bullet `Pass the state objects (...)`, change `` (`OrbitStory`, `RocketFlight`) `` to `` (`JourneyState`, `AuthOrbitState`, `RocketFlight`) ``.

Replace the two bullets that start with `- Orbit files take forward from travel` and `- File labels sit on the camera-facing orbit binormal` with:

```markdown
- Orbit items come from `SYNCED_FILES` (`lib/syncedFiles.ts`) through `createFileSystemOrbits`. One seed fixes the lanes in `fileOrbitLayout.ts`. Forward is the analytic lane tangent, up is the planet radial. Follow that frame with `quaternion.slerp` and `1 - exp(-lambda * dt)`, then roll around local X. Spin each dashed lane ring on its normal with the lane mean anomaly (`LineDashedMaterial` in three r186 has no `dashOffset`).
- File labels sit on the camera-facing orbit binormal. When the item's view-plane distance to the planet center is inside `LABEL_CLEARANCE_RADIUS` (1.85 radii), push the label outward in that plane so it clears the disk.
- The landing journey camera takes one pose per frame: `placeCamera(hero)`, then `blendCameraToward(focus)`, then `blendCameraToward(story)`. Position uses lerp, view uses slerp. Do not add a second smoother.
- Rocket travel is a pure function of story progress: `rocketLegProgress(storyLegProgress(story, leg), index, count, ROCKET_STAGGER)`. Keep no time state in travel, so scrubbing backward reverses cleanly. Only exhaust flicker reads elapsed time.
- Story autoplay status changes only through `nextAutoplayStatus` (`lib/syncStoryTimeline.ts`). The play/pause button carries `data-autoplay-control`; its input does not count as user input.
- Create the journey pin ScrollTrigger before any ScrollTrigger below it (the maker reveal), so later starts include the pin spacing.
- React and `lib/` files import scene modules with `import type` only. The loader's dynamic `import()` is the only runtime import, so `three` stays out of the main chunk.
```

- [ ] **Step 5: Full verification**

Run from the repo root:

```bash
npm test -w @cursor-sync/web
npm run build -w @cursor-sync/web
node /home/marcelo/.cursor/skills/code-architecture/scripts/quality-gate.mjs
rg -n "planetOrbitScene|createSyncRelay|OrbitStory|\"sealed\"|hero-window|auth-terminal" apps/web/src
wc -l apps/web/src/scenes/*.ts apps/web/src/lib/*.ts apps/web/src/components/FileFocusCard.tsx
rg -l "WebGLRenderer" apps/web/dist/assets
```

Expected: 8 test files pass (64 tests: 42 baseline, 5 from Task 1, 17 from Task 7); build exit 0; gate exit 0; the dead-name `rg` prints nothing; every new file is at most 300 lines; `WebGLRenderer` appears only in lazy chunks, not in the entry chunk named in `apps/web/dist/index.html`.

- [ ] **Step 6: Full browser pass (driven path, screenshots)**

1. Hero at rest; hero with one item focused (card visible); Esc release.
2. Mid-handoff; steps 01, 02, 03, 04 (one capture each).
3. A step click scrolls to the right step; autoplay starts after idle and stops on wheel.
4. Sign-in success against the local API: expansion, success panel, Continue goes to `/auth/continue`. If the API is not running, report this as an unverified gap.
5. WebGL off (Chrome with `--disable-webgl`): the hero shows the gradient fallback; the keyboard file list still opens the card, centered; the auth panel shows its gradient and success replaces the card in place.

- [ ] **Step 7: Diff review**

Run `git diff --stat` and `git status --short`. Revert any hunk this plan did not need. The working tree already held unrelated user changes before Task 1; leave them alone.

- [ ] **Step 8: Rule check and checkpoint (no commit)**

Re-read `.cursor/rules/threejs-scenes.mdc` against the final code. Report every task as done or not done, the commands with their exit codes, the screenshots, the spec deviations listed at the top of this plan, and any unverified gap (for example, the API-backed sign-in path). Ask the user before any commit.

---

## Self-review against the spec

- Section 1 (hero): centered stack layout and copy (Task 6); four seeded lanes with mixed direction and speed, `deltaSeconds` motion, slerp frame, label clearance (Tasks 1, 2); hover pointer and glow (Task 4); focus tween 1.2 s, speed to 0 in about 0.4 s, lerp position and slerp view, 30 percent dim (Tasks 2, 4); card placed from the projected position and clamped (Task 5); leave by close, Esc, empty click, or scroll; previous and next without a full release (Tasks 4, 5); hidden keyboard list, labelled region, focus return (Tasks 5, 6); reduced motion freezes orbits and cuts focus (Tasks 2, 4).
- Section 2 (journey): one pinned timeline with hero 0.4, handoff 1, steps 3.4 (Task 10); hash and nav link scroll to `step1` (Task 10); step copy and note, telemetry removed (Tasks 7, 10); key and lock ring, staggered labelled rockets, original pulse, station copies, machine 02 copies (Tasks 8, 9); pure leg progress, Bezier arcs, tangent orientation, bounded flicker, trail pool allocated once (Tasks 7, 8); authored shots with narrow fit (Task 9); step clicks, autoplay states, hidden-tab pause, reduced motion (Tasks 10, 11).
- Section 3 (auth): obsidian scene with no terminal (Task 12); Flip expansion, expand tween, halo shift, success copy, manual Continue, reduced-motion or WebGL-off fallback, unchanged errors (Task 13).
- Error handling: gradient fallbacks (Tasks 6, 12); centered card without WebGL (Task 5); label font fallback unchanged; ScrollTo autoKill moves autoplay to `stopped` (Task 11); `gsap.context` revert and stage disposables (Tasks 4, 9, 10, 13).
- Testing: seeded placement and clearance (Task 1); leg progress, step label mapping, autoplay transitions (Task 7); build in every task; full browser pass (Task 14). Gap kept from the spec: no React component test library, so the connected view is browser-verified only.
- Cleanup: `planetOrbitScene.ts` deleted, `syncStoryProps.ts` pruned, `sealed` tone removed, rule updated (Task 14).
- Placeholder scan: no TBD or TODO; every code step shows the code.
- Type consistency: `createFileSystemOrbits(syncedFiles, seed, disposables)`, `createGlowPlanet(theme, disposables)`, `createCloudStation(position, dockCount, disposables)`, `createSyncRockets(syncedFiles, route, disposables)`, `useHeroFileFocus(journeyStateRef, journeyScene, cardRef)`, and `useStoryAutoplay(storyStepIndex, scrollToStep)` use the same names and argument order in every task that consumes them.
