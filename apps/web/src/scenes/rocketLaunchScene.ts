import * as THREE from "three";
import gsap from "gsap";
import { createSceneStage, type Disposable } from "./sceneStage";
import { createBergamotGroundMaterial, createGlowMaterial, createSoftDotTexture, createStarField } from "./celestialBodies";
import { createLaunchPad, createRocketModel, ROCKET_FRAME_BASE_Y, ROCKET_FRAME_HEIGHT, type RocketModel } from "./rocketParts";

export type RocketFlight = { mission: number };

export type RocketLaunchScene = {
  flight: RocketFlight;
  dispose: () => void;
};

const WORLD_RADIUS = 60;
const WORLD_CENTER = new THREE.Vector3(0, -WORLD_RADIUS, 0);
const ROCKET_AXIS = new THREE.Vector3(0, 1, 0);
const SIDE_AXIS = new THREE.Vector3(0, 0, 1);
const SMOKE_PUFFS = 240;
const easeOutCubic = gsap.parseEase("power3.out");
const easeOutBack = gsap.parseEase("back.out(1.8)");
const easeIn = gsap.parseEase("power2.in");
const easeInOut = gsap.parseEase("sine.inOut");

function phaseProgress(mission: number, phaseStart: number): number {
  return THREE.MathUtils.clamp(mission - phaseStart, 0, 1);
}

function createHomeWorld(disposables: Disposable[]): THREE.Group {
  const worldGeometry = new THREE.SphereGeometry(WORLD_RADIUS, 192, 128);
  const worldMaterial = createBergamotGroundMaterial(WORLD_RADIUS);
  const rimMaterial = createGlowMaterial("rim", "#ffd7af", 0.55);
  const haloMaterial = createGlowMaterial("halo", "#e87a2e", 0.55);
  disposables.push(worldGeometry, worldMaterial, rimMaterial, haloMaterial);
  const rim = new THREE.Mesh(worldGeometry, rimMaterial);
  rim.scale.setScalar(1.07);
  const halo = new THREE.Mesh(worldGeometry, haloMaterial);
  halo.scale.setScalar(1.08);
  const homeWorld = new THREE.Group();
  homeWorld.position.copy(WORLD_CENTER);
  homeWorld.add(new THREE.Mesh(worldGeometry, worldMaterial), rim, halo);
  return homeWorld;
}

function createLaunchSmoke(disposables: Disposable[]): { smoke: THREE.Points; update: (spread: number, density: number) => void } {
  const smokeSeeds = Float32Array.from({ length: SMOKE_PUFFS * 4 }, () => Math.random());
  const smokePositions = new Float32Array(SMOKE_PUFFS * 3);
  const smokeGeometry = new THREE.BufferGeometry();
  smokeGeometry.setAttribute("position", new THREE.BufferAttribute(smokePositions, 3));
  const smokeTexture = createSoftDotTexture();
  const smokeMaterial = new THREE.PointsMaterial({
    color: "#8f9194",
    map: smokeTexture,
    size: 1.1,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  disposables.push(smokeGeometry, smokeTexture, smokeMaterial);
  const smoke = new THREE.Points(smokeGeometry, smokeMaterial);
  return {
    smoke,
    update: (spread, density) => {
      smoke.visible = density > 0.001;
      smokeMaterial.opacity = density * 0.55;
      for (let puffIndex = 0; puffIndex < SMOKE_PUFFS; puffIndex += 1) {
        const heading = (smokeSeeds[puffIndex * 4] ?? 0) * Math.PI * 2;
        const reach = 0.3 + spread * (1.5 + (smokeSeeds[puffIndex * 4 + 1] ?? 0) * 4.5);
        const rise = 0.1 + spread * (smokeSeeds[puffIndex * 4 + 2] ?? 0) * 1.6;
        smokePositions.set([Math.cos(heading) * reach, rise, Math.sin(heading) * reach], puffIndex * 3);
      }
      smokeGeometry.attributes.position.needsUpdate = true;
    },
  };
}

function assembleRocket(model: RocketModel, mission: number, elapsedSeconds: number): void {
  const noseShare = phaseProgress(mission, 0);
  model.nose.visible = noseShare > 0.001;
  model.nose.position.y = (1 - easeOutBack(noseShare)) * 2.8;
  const portholeGlow = THREE.MathUtils.clamp((noseShare - 0.6) / 0.4, 0, 1);
  model.portholeMaterial.emissiveIntensity = portholeGlow * (1.8 + Math.sin(elapsedSeconds * 3) * 0.4);

  const hullShare = phaseProgress(mission, 1);
  model.hullPanels.forEach((hullPanel, panelIndex) => {
    const panelShare = THREE.MathUtils.clamp(hullShare * 1.75 - panelIndex * 0.25, 0, 1);
    const panelSettle = easeOutCubic(panelShare);
    const panelHeading = (panelIndex * Math.PI) / 2 + Math.PI / 4;
    const panelGap = (1 - panelSettle) * 1.5;
    hullPanel.visible = panelShare > 0.001;
    hullPanel.position.set(Math.sin(panelHeading) * panelGap, 2.5, Math.cos(panelHeading) * panelGap);
    hullPanel.rotation.y = (1 - panelSettle) * 0.8;
    hullPanel.material.opacity = panelShare;
  });
  model.hullSeamMaterial.opacity = THREE.MathUtils.clamp((hullShare - 0.85) / 0.15, 0, 1);

  const tankShare = phaseProgress(mission, 2);
  model.tankStage.visible = tankShare > 0.001;
  model.tankStage.position.y = -(1 - easeOutCubic(THREE.MathUtils.clamp(tankShare / 0.7, 0, 1))) * 2.4;
  const finShare = easeOutBack(THREE.MathUtils.clamp((tankShare - 0.6) / 0.4, 0, 1));
  model.fins.forEach((fin) => {
    fin.scale.x = Math.max(finShare, 0.001);
  });
}

function engineThrust(mission: number): number {
  if (mission < 2.8) return 0;
  if (mission < 3) return ((mission - 2.8) / 0.2) * 0.5;
  if (mission < 5.6) return 1;
  if (mission < 6) return THREE.MathUtils.lerp(1, 0.08, (mission - 5.6) / 0.4);
  return 0.08 + 0.4 * THREE.MathUtils.smoothstep(mission, 6, 6.3);
}

export function createRocketLaunchScene(host: HTMLElement, flight: RocketFlight): RocketLaunchScene | null {
  const stage = createSceneStage(host, 40);
  if (!stage) return null;
  const { scene, camera, disposables, prefersReducedMotion } = stage;

  scene.add(new THREE.AmbientLight("#fff4ea", 0.22));
  const sunLight = new THREE.DirectionalLight("#fff1e0", 3.1);
  sunLight.position.set(-48, 22, 30);
  const fillLight = new THREE.DirectionalLight("#8ec8e6", 0.35);
  fillLight.position.set(20, 5, -10);
  scene.add(sunLight, fillLight, createStarField(disposables, 1600, 220, 420), createHomeWorld(disposables));

  const model = createRocketModel(disposables);
  const { pad, armPivot, beaconMaterial } = createLaunchPad(disposables);
  const { smoke, update: updateSmoke } = createLaunchSmoke(disposables);
  scene.add(pad, smoke, model.rocket);

  const radialUp = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const rocketAxis = new THREE.Vector3();
  const focus = new THREE.Vector3();
  const cameraOffset = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const frameRoot = new THREE.Vector3();
  const revealNormal = new THREE.Vector3();

  stage.start((_deltaSeconds, elapsedSeconds) => {
    const motionScale = prefersReducedMotion ? 0 : 1;
    const mission = flight.mission;
    assembleRocket(model, mission, elapsedSeconds);

    const liftoff = phaseProgress(mission, 3);
    const ascent = phaseProgress(mission, 4);
    const orbitInsertion = phaseProgress(mission, 5);
    const beyond = phaseProgress(mission, 6);
    const altitude = 2.6 * easeIn(liftoff) + 15 * easeInOut(ascent) + 3 * easeInOut(orbitInsertion) + 70 * easeIn(beyond);
    const sweep = 0.32 * ascent * ascent + 0.85 * easeInOut(orbitInsertion) + 0.5 * beyond;
    const pitch = 1.2 * easeInOut(ascent) + (Math.PI / 2 - 1.2) * easeInOut(orbitInsertion) - 0.35 * beyond;
    radialUp.set(Math.sin(sweep), Math.cos(sweep), 0);
    tangent.set(Math.cos(sweep), -Math.sin(sweep), 0);
    rocketAxis.copy(radialUp).multiplyScalar(Math.cos(pitch)).addScaledVector(tangent, Math.sin(pitch));

    const thrust = engineThrust(mission);
    const padShake = thrust * (1 - liftoff) * 0.02 * motionScale;
    model.rocket.position.copy(WORLD_CENTER).addScaledVector(radialUp, WORLD_RADIUS + altitude);
    model.rocket.position.addScaledVector(SIDE_AXIS, Math.sin(elapsedSeconds * 71) * padShake);
    model.rocket.quaternion.setFromUnitVectors(ROCKET_AXIS, rocketAxis);
    const frameShare = easeOutCubic(THREE.MathUtils.clamp(mission + 1, 0, 1));
    model.frame.visible = frameShare > 0.001;
    frameRoot.set(0, ROCKET_FRAME_BASE_Y, 0);
    model.rocket.localToWorld(frameRoot);
    revealNormal.copy(rocketAxis).negate();
    frameRoot.addScaledVector(rocketAxis, frameShare * (ROCKET_FRAME_HEIGHT + 0.15));
    model.frameReveal.setFromNormalAndCoplanarPoint(revealNormal, frameRoot);
    const flicker = 1 + Math.sin(elapsedSeconds * 47) * 0.1 * motionScale;
    model.flame.visible = thrust > 0.01;
    model.flame.scale.set(0.7 + 0.3 * thrust, Math.max(thrust * flicker, 0.001), 0.7 + 0.3 * thrust);
    model.engineLight.intensity = thrust * 14 * flicker;

    armPivot.rotation.y = -THREE.MathUtils.clamp((mission - 2.85) / 0.3, 0, 1) * 1.3;
    beaconMaterial.opacity = 0.35 + 0.65 * (Math.sin(elapsedSeconds * 4) > 0 ? 1 : 0);
    updateSmoke(THREE.MathUtils.clamp((mission - 2.95) / 1.6, 0, 1), THREE.MathUtils.clamp((mission - 2.95) / 0.4, 0, 1) * (1 - THREE.MathUtils.clamp((mission - 4.2) / 0.8, 0, 1)));

    const narrowFit = Math.max(1, 0.85 / stage.aspect());
    const distance = (8.5 + 3 * liftoff + 14 * easeInOut(ascent) + 8 * orbitInsertion + 96 * beyond) * narrowFit;
    const height = 1 + liftoff + 5 * ascent + 4 * orbitInsertion - beyond;
    const lookDrop = 1.5 * ascent + 3 * orbitInsertion + 27.5 * beyond;
    const sway = Math.sin(elapsedSeconds * 0.15) * 0.28 * motionScale;
    focus.copy(model.rocket.position).addScaledVector(rocketAxis, 2.4);
    cameraOffset.copy(SIDE_AXIS).multiplyScalar(distance).applyAxisAngle(radialUp, sway);
    camera.position.copy(focus).add(cameraOffset).addScaledVector(radialUp, height).addScaledVector(tangent, -2 * ascent);
    camera.up.copy(radialUp);
    camera.lookAt(lookTarget.copy(focus).addScaledVector(radialUp, -lookDrop));
  });

  return { flight, dispose: stage.dispose };
}
