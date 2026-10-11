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
