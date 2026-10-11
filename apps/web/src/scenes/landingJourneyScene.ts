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
