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
  label.position.copy(itemPosition).addScaledVector(binormal, 0.36 * facing);
  labelView.copy(viewPoint);
  if (labelView.lengthSq() < 1e-6) labelView.set(0, 0, 1);
  labelView.normalize();
  labelOutward.copy(label.position).addScaledVector(labelView, -label.position.dot(labelView));
  const labelPlaneDistance = labelOutward.length();
  if (labelPlaneDistance >= LABEL_CLEARANCE_RADIUS) return;
  if (labelPlaneDistance > 1e-4) {
    label.position.addScaledVector(labelOutward, (LABEL_CLEARANCE_RADIUS - labelPlaneDistance) / labelPlaneDistance);
    return;
  }
  label.position.addScaledVector(labelOutward, -1);
  labelOutward.copy(itemPosition).addScaledVector(labelView, -itemPosition.dot(labelView));
  const itemPlaneDistance = labelOutward.length();
  if (itemPlaneDistance > 1e-4) labelOutward.multiplyScalar(1 / itemPlaneDistance);
  else labelOutward.set(0, 1, 0);
  label.position.addScaledVector(labelOutward, LABEL_CLEARANCE_RADIUS);
}
