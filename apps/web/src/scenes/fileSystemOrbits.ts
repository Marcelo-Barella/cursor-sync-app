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
  setPresence: (itemIndex: number, presence: number) => void;
  setPulse: (itemIndex: number, pulse: number) => void;
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
  const presences = orbitItems.map(() => 1);
  const pulses = orbitItems.map(() => 0);

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
        const presence = presences[itemIndex];
        const pulse = pulses[itemIndex];
        orbitItem.body.visible = presence > 0.01;
        orbitItem.label.visible = presence > 0.01;
        orbitItem.body.scale.setScalar(Math.max(presence, 0.001) * (1 + 0.6 * pulse));
        orbitItem.material.opacity = opacity;
        orbitItem.material.depthWrite = opacity === 1;
        orbitItem.material.emissiveIntensity = (emphasized ? HOVER_GLOW : REST_GLOW) + 1.5 * pulse;
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
    setPresence: (itemIndex, presence) => {
      presences[itemIndex] = presence;
    },
    setPulse: (itemIndex, pulse) => {
      pulses[itemIndex] = pulse;
    },
    itemWorldPosition: (itemId, target) => {
      const orbitItem = orbitItems.find((candidate) => candidate.id === itemId);
      return orbitItem ? orbitItem.body.getWorldPosition(target) : null;
    },
  };
}
