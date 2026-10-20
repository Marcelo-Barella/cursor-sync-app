import * as THREE from "three";
import type { Disposable } from "./sceneStage";
import { createSoftDotTexture } from "./celestialBodies";

export const ROCKET_FRAME_BASE_Y = 0.42;
export const ROCKET_FRAME_HEIGHT = 3.6;

export type RocketModel = {
  rocket: THREE.Group;
  frame: THREE.Group;
  frameReveal: THREE.Plane;
  nose: THREE.Group;
  portholeMaterial: THREE.MeshStandardMaterial;
  hullPanels: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>[];
  hullSeamMaterial: THREE.MeshBasicMaterial;
  tankStage: THREE.Group;
  fins: THREE.Mesh<THREE.ExtrudeGeometry, THREE.MeshStandardMaterial>[];
  flame: THREE.Group;
  engineLight: THREE.PointLight;
};

export type LaunchPad = {
  pad: THREE.Group;
  armPivot: THREE.Group;
  beaconMaterial: THREE.MeshBasicMaterial;
};

const STRUT_UP = new THREE.Vector3(0, 1, 0);

type Strut = [number, number, number, number, number, number, number];

function addStrut(
  struts: Strut[],
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  radius: number,
): void {
  struts.push([x0, y0, z0, x1, y1, z1, radius]);
}

function createStrutMesh(disposables: Disposable[], material: THREE.Material, struts: readonly Strut[]): THREE.InstancedMesh {
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 8);
  const mesh = new THREE.InstancedMesh(geometry, material, struts.length);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  struts.forEach((strut, index) => {
    direction.set(strut[3] - strut[0], strut[4] - strut[1], strut[5] - strut[2]);
    const length = Math.max(direction.length(), 0.0001);
    position.set((strut[0] + strut[3]) * 0.5, (strut[1] + strut[4]) * 0.5, (strut[2] + strut[5]) * 0.5);
    quaternion.setFromUnitVectors(STRUT_UP, direction.multiplyScalar(1 / length));
    mesh.setMatrixAt(index, matrix.compose(position, quaternion, scale.set(strut[6], length, strut[6])));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  disposables.push(geometry);
  return mesh;
}

function createRocketFrame(disposables: Disposable[], material: THREE.Material): THREE.Group {
  const struts: Strut[] = [];
  const radius = 0.36;
  const count = 6;
  const bays = 5;
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const next = ((index + 1) / count) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const nextX = Math.cos(next) * radius;
    const nextZ = Math.sin(next) * radius;
    addStrut(struts, x, 0, z, x, ROCKET_FRAME_HEIGHT, z, 0.042);
    for (let bay = 0; bay <= bays; bay += 1) {
      const y = (bay / bays) * ROCKET_FRAME_HEIGHT;
      addStrut(struts, x, y, z, nextX, y, nextZ, 0.022);
    }
    for (let bay = 0; bay < bays; bay += 1) {
      const y0 = (bay / bays) * ROCKET_FRAME_HEIGHT;
      const y1 = ((bay + 1) / bays) * ROCKET_FRAME_HEIGHT;
      addStrut(struts, x, y0, z, nextX, y1, nextZ, 0.016);
    }
  }
  const frame = new THREE.Group();
  frame.add(createStrutMesh(disposables, material, struts));
  return frame;
}

function createGantry(disposables: Disposable[], material: THREE.Material): THREE.Group {
  const struts: Strut[] = [];
  const corners: readonly (readonly [number, number])[] = [
    [-1.58, -0.24],
    [-1.16, -0.24],
    [-1.16, 0.24],
    [-1.58, 0.24],
  ];
  const top = 5.25;
  const levels = 6;
  corners.forEach(([x, z], index) => {
    const next = corners[(index + 1) % corners.length] ?? [x, z];
    addStrut(struts, x, 0, z, x, top, z, 0.05);
    for (let level = 0; level <= levels; level += 1) {
      const y = (level / levels) * top;
      addStrut(struts, x, y, z, next[0], y, next[1], 0.026);
    }
    for (let level = 0; level < levels; level += 1) {
      const y0 = (level / levels) * top;
      const y1 = ((level + 1) / levels) * top;
      addStrut(struts, x, y0, z, next[0], y1, next[1], 0.018);
    }
  });
  const gantry = new THREE.Group();
  gantry.add(createStrutMesh(disposables, material, struts));
  return gantry;
}

function createOgiveNose(): THREE.LatheGeometry {
  const length = 1.18;
  const radius = 0.44;
  const rho = (radius * radius + length * length) / (2 * radius);
  const points = Array.from({ length: 14 }, (_, index) => {
    const along = (index / 13) * length;
    const x = Math.sqrt(Math.max(rho * rho - along * along, 0)) + radius - rho;
    return new THREE.Vector2(Math.max(x, 0.0001), along);
  });
  const geometry = new THREE.LatheGeometry(points, 36);
  geometry.translate(0, ROCKET_FRAME_HEIGHT, 0);
  return geometry;
}

function createFinGeometry(): THREE.ExtrudeGeometry {
  const finOutline = new THREE.Shape();
  finOutline.moveTo(0, 0.85);
  finOutline.lineTo(0.44, 0.05);
  finOutline.lineTo(0.44, -0.18);
  finOutline.lineTo(0, 0);
  finOutline.closePath();
  const finGeometry = new THREE.ExtrudeGeometry(finOutline, { depth: 0.028, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1 });
  finGeometry.translate(0, 0, -0.022);
  return finGeometry;
}

function createFlame(disposables: Disposable[]): THREE.Group {
  const outerGeometry = new THREE.ConeGeometry(0.3, 1.9, 24, 1, true);
  outerGeometry.rotateX(Math.PI);
  outerGeometry.translate(0, -0.95, 0);
  const innerGeometry = new THREE.ConeGeometry(0.15, 1.05, 20, 1, true);
  innerGeometry.rotateX(Math.PI);
  innerGeometry.translate(0, -0.52, 0);
  const flameMaterial = (flameColor: string, flameOpacity: number) =>
    new THREE.MeshBasicMaterial({
      color: flameColor,
      transparent: true,
      opacity: flameOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  const outerMaterial = flameMaterial("#f97316", 0.75);
  const innerMaterial = flameMaterial("#ffe7b0", 0.95);
  const glowTexture = createSoftDotTexture();
  const glowMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: "#f97316",
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  disposables.push(outerGeometry, innerGeometry, outerMaterial, innerMaterial, glowTexture, glowMaterial);
  const glow = new THREE.Sprite(glowMaterial);
  glow.scale.setScalar(1.8);
  glow.position.y = -0.3;
  const flame = new THREE.Group();
  flame.add(new THREE.Mesh(outerGeometry, outerMaterial), new THREE.Mesh(innerGeometry, innerMaterial), glow);
  return flame;
}

export function createRocketModel(disposables: Disposable[]): RocketModel {
  const hullMaterial = new THREE.MeshStandardMaterial({ color: "#e7e2dc", metalness: 0.48, roughness: 0.31 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: "#2a2a2c", metalness: 0.55, roughness: 0.36 });
  const bandMaterial = new THREE.MeshStandardMaterial({ color: "#e87a2e", emissive: "#e87a2e", emissiveIntensity: 0.35 });
  const portholeMaterial = new THREE.MeshStandardMaterial({ color: "#ffa366", emissive: "#ffa366", emissiveIntensity: 0 });
  const hullSeamMaterial = new THREE.MeshBasicMaterial({ color: "#c0c1ff", transparent: true, opacity: 0 });
  const frameReveal = new THREE.Plane(new THREE.Vector3(0, -1, 0), 80);
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: "#d5dee6",
    metalness: 0.28,
    roughness: 0.42,
    emissive: "#14506e",
    emissiveIntensity: 0.45,
    clippingPlanes: [frameReveal],
  });
  const noseGeometry = createOgiveNose();
  const collarGeometry = new THREE.TorusGeometry(0.43, 0.016, 8, 28);
  const portholeRimGeometry = new THREE.TorusGeometry(0.12, 0.022, 10, 32);
  const portholeGlassGeometry = new THREE.CircleGeometry(0.1, 32);
  const seamGeometry = new THREE.TorusGeometry(0.447, 0.014, 8, 64);
  const tankGeometry = new THREE.CylinderGeometry(0.48, 0.48, 1.4, 40);
  const bandGeometry = new THREE.CylinderGeometry(0.487, 0.487, 0.16, 40);
  const bellGeometry = new THREE.LatheGeometry(
    [new THREE.Vector2(0.16, 0), new THREE.Vector2(0.2, -0.1), new THREE.Vector2(0.3, -0.3), new THREE.Vector2(0.36, -ROCKET_FRAME_BASE_Y)],
    32,
  );
  const finGeometry = createFinGeometry();
  disposables.push(hullMaterial, darkMetal, bandMaterial, portholeMaterial, hullSeamMaterial, frameMaterial);
  disposables.push(noseGeometry, collarGeometry, portholeRimGeometry, portholeGlassGeometry, seamGeometry, tankGeometry, bandGeometry, bellGeometry, finGeometry);

  const body = new THREE.Group();
  body.position.y = ROCKET_FRAME_BASE_Y;
  const frame = createRocketFrame(disposables, frameMaterial);

  const nose = new THREE.Group();
  const noseCone = new THREE.Mesh(noseGeometry, hullMaterial);
  const noseCollar = new THREE.Mesh(collarGeometry, darkMetal);
  noseCollar.rotation.x = Math.PI / 2;
  noseCollar.position.y = ROCKET_FRAME_HEIGHT;
  const portholeRim = new THREE.Mesh(portholeRimGeometry, darkMetal);
  portholeRim.position.set(0, 2.95, 0.446);
  const portholeGlass = new THREE.Mesh(portholeGlassGeometry, portholeMaterial);
  portholeGlass.position.set(0, 2.95, 0.45);
  nose.add(noseCone, noseCollar, portholeRim, portholeGlass);

  const hullPanels = [0, 1, 2, 3].map((panelIndex) => {
    const panelGeometry = new THREE.CylinderGeometry(0.44, 0.44, 2.2, 24, 1, true, (panelIndex * Math.PI) / 2, Math.PI / 2);
    const panelMaterial = hullMaterial.clone();
    panelMaterial.transparent = true;
    panelMaterial.side = THREE.DoubleSide;
    disposables.push(panelGeometry, panelMaterial);
    const hullPanel = new THREE.Mesh(panelGeometry, panelMaterial);
    hullPanel.position.y = 2.5;
    return hullPanel;
  });
  const hullSeams = [1.4, 3.6].map((seamHeight) => {
    const hullSeam = new THREE.Mesh(seamGeometry, hullSeamMaterial);
    hullSeam.rotation.x = Math.PI / 2;
    hullSeam.position.y = seamHeight;
    return hullSeam;
  });

  const tankStage = new THREE.Group();
  const tank = new THREE.Mesh(tankGeometry, darkMetal);
  tank.position.y = 0.7;
  const band = new THREE.Mesh(bandGeometry, bandMaterial);
  band.position.y = 1.05;
  const bell = new THREE.Mesh(bellGeometry, darkMetal);
  const fins = [0, 1, 2, 3].map((finIndex) => {
    const finPivot = new THREE.Group();
    finPivot.rotation.y = (finIndex * Math.PI) / 2 + Math.PI / 4;
    const fin = new THREE.Mesh(finGeometry, hullMaterial);
    fin.position.set(0.44, 0.05, 0);
    finPivot.add(fin);
    tankStage.add(finPivot);
    return fin;
  });
  tankStage.add(tank, band, bell);

  body.add(frame, nose, ...hullPanels, ...hullSeams, tankStage);
  const flame = createFlame(disposables);
  const engineLight = new THREE.PointLight("#f97316", 0, 9, 1.6);
  engineLight.position.y = -0.5;
  const rocket = new THREE.Group();
  rocket.add(body, flame, engineLight);
  return { rocket, frame, frameReveal, nose, portholeMaterial, hullPanels, hullSeamMaterial, tankStage, fins, flame, engineLight };
}

export function createLaunchPad(disposables: Disposable[]): LaunchPad {
  const deckGeometry = new THREE.CylinderGeometry(1.7, 1.95, 0.3, 48);
  const deckMaterial = new THREE.MeshStandardMaterial({ color: "#1c1b1e", metalness: 0.5, roughness: 0.6 });
  const gantryMaterial = new THREE.MeshStandardMaterial({ color: "#c5c8ce", metalness: 0.22, roughness: 0.46 });
  const apronGeometry = new THREE.RingGeometry(2.02, 3.3, 64);
  apronGeometry.rotateX(-Math.PI / 2);
  const apronMaterial = new THREE.MeshStandardMaterial({ color: "#241610", roughness: 0.96, metalness: 0.04 });
  const armGeometry = new THREE.BoxGeometry(1.05, 0.09, 0.09);
  const beaconGeometry = new THREE.SphereGeometry(0.05, 12, 12);
  const beaconMaterial = new THREE.MeshBasicMaterial({ color: "#ff4d4d", transparent: true });
  disposables.push(deckGeometry, deckMaterial, gantryMaterial, apronGeometry, apronMaterial, armGeometry, beaconGeometry, beaconMaterial);

  const deck = new THREE.Mesh(deckGeometry, deckMaterial);
  deck.position.y = -0.15;
  const gantry = createGantry(disposables, gantryMaterial);
  const apron = new THREE.Mesh(apronGeometry, apronMaterial);
  apron.position.y = 0.004;
  const armPivot = new THREE.Group();
  armPivot.position.set(-1.13, 3.3, 0);
  const arm = new THREE.Mesh(armGeometry, deckMaterial);
  arm.position.x = 0.47;
  armPivot.add(arm);
  const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
  beacon.position.set(-1.37, 5.32, 0);

  const pad = new THREE.Group();
  pad.add(apron, deck, gantry, armPivot, beacon);
  return { pad, armPivot, beaconMaterial };
}
