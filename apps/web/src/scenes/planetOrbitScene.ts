import * as THREE from "three";
import gsap from "gsap";
import { createSceneStage, type Disposable } from "./sceneStage";
import {
  BERGAMOT_PLANET_PALETTE,
  OBSIDIAN_PLANET_PALETTE,
  attachBandAdvection,
  createGlowMaterial,
  createPlanetSurfaceTexture,
  createSoftDotTexture,
  createStarField,
  type PlanetPalette,
} from "./celestialBodies";
import { createFileLabelSprite, loadLabelFont } from "./orbitFileLabel";
import { createPassphraseKey, createSyncRelay } from "./syncStoryProps";

export type PlanetTheme = "bergamot" | "obsidian";

export type OrbitStory = {
  arrival: number;
  reveal: number;
  key: number;
  seal: number;
  transit: number;
};

export type PlanetOrbitOptions = {
  theme: PlanetTheme;
  fileNames: readonly string[];
  story: OrbitStory;
};

export type PlanetOrbitScene = {
  story: OrbitStory;
  dispose: () => void;
};

type OrbitFile = {
  documentMesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  capsuleMesh: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshBasicMaterial>;
  plainLabel: THREE.Sprite;
  sealedLabel: THREE.Sprite;
  sealBeam: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  spin: number;
  placed: boolean;
  lastPosition: THREE.Vector3;
  lastForward: THREE.Vector3;
};

type ThemeStyle = { palette: PlanetPalette; halo: string; rim: string; emissive: number; haloOpacity: number };

const THEME_STYLES: Record<PlanetTheme, ThemeStyle> = {
  bergamot: { palette: BERGAMOT_PLANET_PALETTE, halo: "#e87a2e", rim: "#ffd7af", emissive: 0.22, haloOpacity: 0.45 },
  obsidian: { palette: OBSIDIAN_PLANET_PALETTE, halo: "#06b6d4", rim: "#64dcff", emissive: 0.06, haloOpacity: 0.16 },
};

const PLANET_RADIUS = 1;
const ORBIT_RADIUS = 2.15;
const ORBIT_MEAN_MOTION = 0.3;
const PLAIN_EMISSIVE = new THREE.Color("#e87a2e");
const SEALED_EMISSIVE = new THREE.Color("#6366f1");
const LOCAL_X = new THREE.Vector3(1, 0, 0);
const fileForward = new THREE.Vector3();
const fileUp = new THREE.Vector3();
const fileBinormal = new THREE.Vector3();
const correctedUp = new THREE.Vector3();
const localTangent = new THREE.Vector3();
const fileBasis = new THREE.Matrix4();
const fileTarget = new THREE.Quaternion();
const fileRoll = new THREE.Quaternion();
const labelView = new THREE.Vector3();
const labelOutward = new THREE.Vector3();
const easeOutBack = gsap.parseEase("back.out(1.7)");
const easeOutCubic = gsap.parseEase("power3.out");
const easeInOut = gsap.parseEase("power2.inOut");

function staggeredProgress(progress: number, itemIndex: number, itemCount: number, stagger: number): number {
  const span = 1 + stagger * (itemCount - 1);
  return THREE.MathUtils.clamp(progress * span - stagger * itemIndex, 0, 1);
}

function orientTraveler(
  mesh: THREE.Object3D,
  forward: THREE.Vector3,
  up: THREE.Vector3,
  roll: number,
  deltaSeconds: number,
): void {
  fileBinormal.crossVectors(forward, up);
  if (fileBinormal.lengthSq() < 1e-6) fileBinormal.set(0, 0, 1);
  fileBinormal.normalize();
  correctedUp.crossVectors(fileBinormal, forward).normalize();
  fileBasis.makeBasis(forward, correctedUp, fileBinormal);
  fileTarget.setFromRotationMatrix(fileBasis);
  fileRoll.setFromAxisAngle(LOCAL_X, roll);
  fileTarget.multiply(fileRoll);
  const follow = 1 - Math.exp(-7 * deltaSeconds);
  mesh.quaternion.slerp(fileTarget, follow);
  mesh.quaternion.normalize();
}

function placeOrbitLabel(
  sprite: THREE.Sprite,
  filePosition: THREE.Vector3,
  binormal: THREE.Vector3,
  planetCenter: THREE.Vector3,
  cameraPoint: THREE.Vector3,
): void {
  const facing = binormal.dot(labelView.copy(cameraPoint).sub(filePosition)) >= 0 ? 1 : -1;
  labelView.copy(cameraPoint).sub(planetCenter);
  if (labelView.lengthSq() < 1e-6) labelView.set(0, 0, 1);
  labelView.normalize();
  labelOutward.copy(filePosition).sub(planetCenter);
  labelOutward.addScaledVector(labelView, -labelOutward.dot(labelView));
  const clearance = labelOutward.length();
  if (clearance > 1e-4) labelOutward.multiplyScalar(1 / clearance);
  else labelOutward.set(0, 1, 0);
  const overlap = THREE.MathUtils.clamp((PLANET_RADIUS * 1.85 - clearance) / PLANET_RADIUS, 0, 1);
  sprite.position.copy(filePosition).addScaledVector(binormal, 0.36 * facing).addScaledVector(labelOutward, 0.55 * overlap);
}

function createOrbitFile(
  fileName: string,
  documentGeometry: THREE.BoxGeometry,
  capsuleGeometry: THREE.IcosahedronGeometry,
  disposables: Disposable[],
): OrbitFile {
  const documentMaterial = new THREE.MeshStandardMaterial({
    color: "#ffa366",
    emissive: "#e87a2e",
    emissiveIntensity: 0.9,
    metalness: 0.2,
    roughness: 0.4,
  });
  const capsuleMaterial = new THREE.MeshBasicMaterial({ color: "#c0c1ff", wireframe: true, transparent: true, opacity: 0 });
  const beamGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const beamMaterial = new THREE.LineBasicMaterial({ color: "#ffa366", transparent: true, opacity: 0, depthWrite: false });
  disposables.push(documentMaterial, capsuleMaterial, beamGeometry, beamMaterial);
  return {
    documentMesh: new THREE.Mesh(documentGeometry, documentMaterial),
    capsuleMesh: new THREE.Mesh(capsuleGeometry, capsuleMaterial),
    plainLabel: createFileLabelSprite(fileName, "plain", 0.24, disposables),
    sealedLabel: createFileLabelSprite(`${fileName}.enc`, "sealed", 0.24, disposables),
    sealBeam: new THREE.Line(beamGeometry, beamMaterial),
    spin: 0,
    placed: false,
    lastPosition: new THREE.Vector3(),
    lastForward: new THREE.Vector3(1, 0, 0),
  };
}

function createPlanet(
  themeStyle: ThemeStyle,
  disposables: Disposable[],
): { planet: THREE.Group; bandTime: { value: number }; haloMaterial: THREE.ShaderMaterial; haloStrength: number } {
  const surfaceTexture = createPlanetSurfaceTexture(themeStyle.palette, 3.1);
  const surfaceGeometry = new THREE.SphereGeometry(PLANET_RADIUS, 96, 96);
  const surfaceMaterial = new THREE.MeshStandardMaterial({
    map: surfaceTexture,
    emissive: "#ffffff",
    emissiveMap: surfaceTexture,
    emissiveIntensity: themeStyle.emissive,
    roughness: 0.85,
  });
  const bandTime = attachBandAdvection(surfaceMaterial);
  const haloStrength = 0.75;
  const rimMaterial = createGlowMaterial("rim", themeStyle.rim, 0.85);
  const haloMaterial = createGlowMaterial("halo", themeStyle.halo, haloStrength);
  const glowTexture = createSoftDotTexture();
  const glowMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: themeStyle.halo,
    transparent: true,
    opacity: themeStyle.haloOpacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const beaconMaterial = new THREE.SpriteMaterial({ map: glowTexture, color: "#ffffff", depthWrite: false });
  disposables.push(surfaceTexture, surfaceGeometry, surfaceMaterial, rimMaterial, haloMaterial, glowTexture, glowMaterial, beaconMaterial);

  const surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
  const rim = new THREE.Mesh(surfaceGeometry, rimMaterial);
  rim.scale.setScalar(1.004);
  const halo = new THREE.Mesh(surfaceGeometry, haloMaterial);
  halo.scale.setScalar(1.24);
  const body = new THREE.Group();
  body.rotation.z = 0.42;
  body.add(surface, rim, halo);
  const glow = new THREE.Sprite(glowMaterial);
  glow.scale.setScalar(5.4);
  glow.position.z = -0.6;
  const beacon = new THREE.Sprite(beaconMaterial);
  beacon.scale.setScalar(0.16);
  beacon.position.z = PLANET_RADIUS + 0.03;
  const planet = new THREE.Group();
  planet.add(glow, body, beacon);
  return { planet, bandTime, haloMaterial, haloStrength };
}

export async function createPlanetOrbitScene(host: HTMLElement, options: PlanetOrbitOptions): Promise<PlanetOrbitScene | null> {
  await loadLabelFont();
  const stage = createSceneStage(host, 38);
  if (!stage) return null;
  const { scene, camera, disposables, prefersReducedMotion } = stage;
  const story = options.story;

  scene.add(new THREE.AmbientLight("#ffffff", 0.35));
  const keyLight = new THREE.DirectionalLight("#fff1e0", 2.6);
  keyLight.position.set(-4, 3, 5);
  const rimLight = new THREE.DirectionalLight(THEME_STYLES[options.theme].halo, 3);
  rimLight.position.set(4, 1, -4);
  scene.add(keyLight, rimLight, createStarField(disposables, 900, 26, 60));

  const rig = new THREE.Group();
  const { planet, bandTime, haloMaterial, haloStrength } = createPlanet(THEME_STYLES[options.theme], disposables);
  const passphraseKey = createPassphraseKey(disposables);
  passphraseKey.position.set(0, 1.4, 0);

  const orbitPlane = new THREE.Group();
  orbitPlane.rotation.set(-1.18, 0, 0.32);
  const ringGeometry = new THREE.BufferGeometry().setFromPoints(
    new THREE.EllipseCurve(0, 0, ORBIT_RADIUS, ORBIT_RADIUS).getPoints(180),
  );
  const ringMaterial = new THREE.LineDashedMaterial({
    color: "#e87a2e",
    dashSize: 0.07,
    gapSize: 0.06,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const orbitRing = new THREE.LineLoop(ringGeometry, ringMaterial);
  orbitRing.computeLineDistances();
  orbitPlane.add(orbitRing);
  rig.add(planet, passphraseKey, orbitPlane);
  scene.add(rig);

  const documentGeometry = new THREE.BoxGeometry(0.13, 0.17, 0.025);
  const capsuleGeometry = new THREE.IcosahedronGeometry(0.16, 1);
  disposables.push(ringGeometry, ringMaterial, documentGeometry, capsuleGeometry);
  const orbitFiles = options.fileNames.map((fileName) => {
    const orbitFile = createOrbitFile(fileName, documentGeometry, capsuleGeometry, disposables);
    scene.add(orbitFile.documentMesh, orbitFile.capsuleMesh, orbitFile.plainLabel, orbitFile.sealedLabel, orbitFile.sealBeam);
    return orbitFile;
  });

  const relay = createSyncRelay(disposables);
  const hostLabel = createFileLabelSprite("machine 01", "node", 0.22, disposables);
  hostLabel.position.set(0, -1.55, 0);
  scene.add(relay.group, hostLabel);

  const pointerTarget = new THREE.Vector2();
  const trackPointer = (pointerEvent: PointerEvent) => {
    pointerTarget.set(pointerEvent.clientX / window.innerWidth - 0.5, pointerEvent.clientY / window.innerHeight - 0.5);
  };
  window.addEventListener("pointermove", trackPointer, { passive: true });
  disposables.push({ dispose: () => window.removeEventListener("pointermove", trackPointer) });

  const orbitPoint = new THREE.Vector3();
  const filePosition = new THREE.Vector3();
  const keyWorld = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const planetCenter = new THREE.Vector3();
  const cameraPoint = new THREE.Vector3();
  let orbitAngle = 0.4;

  stage.start((deltaSeconds, elapsedSeconds) => {
    const motionScale = prefersReducedMotion ? 0 : 1;
    orbitAngle += deltaSeconds * ORBIT_MEAN_MOTION * motionScale;
    const arrival = easeOutCubic(story.arrival);
    planet.scale.setScalar(0.55 + 0.45 * arrival);
    bandTime.value = prefersReducedMotion ? 0 : elapsedSeconds;
    const haloWave = prefersReducedMotion ? 1 : 0.92 + 0.08 * Math.sin(elapsedSeconds * 0.7);
    haloMaterial.uniforms.glowIntensity.value = haloStrength * haloWave;
    const lookAlpha = 1 - Math.exp(-2.4 * deltaSeconds);
    rig.rotation.x = THREE.MathUtils.lerp(rig.rotation.x, pointerTarget.y * 0.18 * motionScale, lookAlpha);
    rig.rotation.y = THREE.MathUtils.lerp(rig.rotation.y, pointerTarget.x * 0.28 * motionScale, lookAlpha);
    ringMaterial.opacity = 0.45 * arrival;
    orbitRing.rotation.z = orbitAngle;
    passphraseKey.visible = story.key > 0.001;
    passphraseKey.scale.setScalar(easeOutBack(story.key));
    passphraseKey.rotation.y = elapsedSeconds * 0.9 * motionScale;
    passphraseKey.getWorldPosition(keyWorld);

    const pan = easeInOut(THREE.MathUtils.clamp(story.transit * 1.6, 0, 1));
    const narrowFit = Math.max(1, (1.05 + 0.6 * pan) / stage.aspect(), stage.aspect() / 1.3);
    const dolly = (1 - arrival) * 5;
    camera.position.set(relay.panX * pan, 0.55 + 0.3 * pan, (7.4 + 5 * pan) * narrowFit + dolly);
    camera.lookAt(lookTarget.set(relay.panX * pan, 0, 0));
    planet.getWorldPosition(planetCenter);
    camera.getWorldPosition(cameraPoint);

    orbitFiles.forEach((orbitFile, fileIndex) => {
      const fileCount = orbitFiles.length;
      const fileReveal = easeOutCubic(staggeredProgress(story.reveal, fileIndex, fileCount, 0.35));
      const fileSeal = staggeredProgress(story.seal, fileIndex, fileCount, 0.3);
      const fileTransit = staggeredProgress(story.transit, fileIndex, fileCount, 0.22);
      const fileAngle = orbitAngle + (fileIndex / fileCount) * Math.PI * 2;
      const orbitRadius = THREE.MathUtils.lerp(PLANET_RADIUS * 0.9, ORBIT_RADIUS, fileReveal);
      const hover = Math.sin(elapsedSeconds * 0.9 + fileIndex * 2.1) * 0.04 * fileReveal * motionScale;
      const cosAngle = Math.cos(fileAngle);
      const sinAngle = Math.sin(fileAngle);
      orbitPlane.localToWorld(orbitPoint.set(cosAngle * orbitRadius, sinAngle * orbitRadius, hover));
      localTangent.set(-sinAngle, cosAngle, 0);
      if (fileTransit > 0) {
        relay.travelPoint(orbitPoint, fileTransit, fileIndex, fileCount, elapsedSeconds, filePosition);
      } else {
        filePosition.copy(orbitPoint);
      }
      if (orbitFile.placed) {
        fileForward.copy(filePosition).sub(orbitFile.lastPosition);
        if (fileForward.lengthSq() < 1e-10) fileForward.copy(orbitFile.lastForward);
        else fileForward.normalize();
      } else {
        orbitPlane.updateWorldMatrix(true, false);
        fileForward.copy(localTangent).transformDirection(orbitPlane.matrixWorld).normalize();
      }
      fileUp.copy(filePosition).sub(planetCenter);
      if (fileUp.lengthSq() < 1e-6) fileUp.set(0, 1, 0);
      else fileUp.normalize();
      orbitFile.spin += deltaSeconds * THREE.MathUtils.lerp(0.2, 0.65, fileSeal) * motionScale;
      orientTraveler(orbitFile.documentMesh, fileForward, fileUp, orbitFile.spin, deltaSeconds);
      orbitFile.capsuleMesh.quaternion.copy(orbitFile.documentMesh.quaternion);
      orbitFile.lastPosition.copy(filePosition);
      orbitFile.lastForward.copy(fileForward);
      orbitFile.placed = true;

      const opened = THREE.MathUtils.clamp((fileTransit - 0.88) / 0.12, 0, 1);
      const sealedShare = fileSeal * (1 - opened);
      const capsuleScale = easeOutBack(fileSeal) * (1 - opened);
      orbitFile.documentMesh.visible = fileReveal > 0.01;
      orbitFile.documentMesh.position.copy(filePosition);
      orbitFile.documentMesh.scale.setScalar(Math.max(fileReveal * (1 - 0.3 * sealedShare), 0.001));
      orbitFile.documentMesh.material.emissive.copy(sealedShare > 0.5 ? SEALED_EMISSIVE : PLAIN_EMISSIVE);
      orbitFile.capsuleMesh.visible = capsuleScale > 0.01;
      orbitFile.capsuleMesh.position.copy(filePosition);
      orbitFile.capsuleMesh.scale.setScalar(Math.max(capsuleScale, 0.001));
      orbitFile.capsuleMesh.material.opacity = 0.75 * sealedShare;
      placeOrbitLabel(orbitFile.plainLabel, filePosition, fileBinormal, planetCenter, cameraPoint);
      placeOrbitLabel(orbitFile.sealedLabel, filePosition, fileBinormal, planetCenter, cameraPoint);
      orbitFile.plainLabel.material.opacity = fileReveal * (1 - sealedShare);
      orbitFile.sealedLabel.material.opacity = fileReveal * sealedShare;
      const beamPositions = orbitFile.sealBeam.geometry.getAttribute("position");
      beamPositions.setXYZ(0, keyWorld.x, keyWorld.y, keyWorld.z);
      beamPositions.setXYZ(1, filePosition.x, filePosition.y, filePosition.z);
      beamPositions.needsUpdate = true;
      orbitFile.sealBeam.material.opacity = Math.sin(Math.PI * fileSeal) * 0.9 * story.key;
      orbitFile.sealBeam.visible = orbitFile.sealBeam.material.opacity > 0.001;
    });

    relay.update(story.transit, elapsedSeconds);
    hostLabel.material.opacity = THREE.MathUtils.clamp(story.transit * 4, 0, 1);
  });

  return { story, dispose: stage.dispose };
}
