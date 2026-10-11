import * as THREE from "three";
import gsap from "gsap";
import type { SyncedFile } from "../lib/syncedFiles";
import { ROCKET_STAGGER, rocketLegProgress } from "../lib/syncStoryTimeline";
import { ORBIT_PLANET_RADIUS } from "./fileOrbitLayout";
import { createFileLabelSprite } from "./orbitFileLabel";
import type { Disposable } from "./sceneStage";
import { createRocketBody, createRocketParts } from "./syncRocketBody";

export type SyncRoute = {
  machineOne: THREE.Vector3;
  machineTwo: THREE.Vector3;
  docks: readonly THREE.Vector3[];
};

export type SyncRockets = {
  group: THREE.Group;
  update: (uploadLeg: number, downloadLeg: number, elapsedSeconds: number, motionScale: number) => void;
  focusPoint: (uploadLeg: number, downloadLeg: number, target: THREE.Vector3) => THREE.Vector3;
};

type RocketLegPath = { start: THREE.Vector3; control: THREE.Vector3; end: THREE.Vector3 };

type RocketTrail = THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;

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
const focusSample = new THREE.Vector3();

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
  pathTangent.addScaledVector(pathChord.subVectors(path.end, path.control), 2 * progress);
  if (pathTangent.lengthSq() < 1e-8) return;
  pathTangent.normalize();
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
    focusPoint: (uploadLeg, downloadLeg, target) => {
      const downloading = downloadLeg > 0;
      const leg = downloading ? downloadLeg : uploadLeg;
      target.set(0, 0, 0);
      let flyingCount = 0;
      rockets.forEach((rocket, rocketIndex) => {
        const flight = rocketLegProgress(leg, rocketIndex, rocketCount, ROCKET_STAGGER);
        if (flight <= 0 || flight >= 1) return;
        const path = downloading ? rocket.downloadPath : rocket.uploadPath;
        bezierPoint(path, easeInOut(flight), focusSample);
        target.add(focusSample);
        flyingCount += 1;
      });
      if (flyingCount > 0) return target.multiplyScalar(1 / flyingCount);
      const parkedRocket = rockets[0];
      if (!parkedRocket) return target;
      const parkedPath = downloading ? parkedRocket.downloadPath : parkedRocket.uploadPath;
      return bezierPoint(parkedPath, leg >= 1 ? 1 : 0, target);
    },
  };
}
