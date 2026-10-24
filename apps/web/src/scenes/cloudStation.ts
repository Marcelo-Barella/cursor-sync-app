import * as THREE from "three";
import type { Disposable } from "./sceneStage";
import { createFileLabelSprite } from "./orbitFileLabel";

export type CloudStation = {
  group: THREE.Group;
  docks: readonly THREE.Vector3[];
  update: (copyPresence: readonly number[], glow: number, elapsedSeconds: number, motionScale: number) => void;
};

const MODULE_AXIS = Math.PI / 2;
const WING_ANCHORS = [-0.76, -0.48, 0.48, 0.76] as const;

function srgbHex(hex: string): string {
  return `#${new THREE.Color(hex).convertLinearToSRGB().getHexString()}`;
}

function canvasTexture(
  width: number,
  height: number,
  paint: (context: CanvasRenderingContext2D) => void,
  disposables: Disposable[],
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) paint(context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  disposables.push(texture);
  return texture;
}

function keep<T extends THREE.BufferGeometry | THREE.Material>(resource: T, disposables: Disposable[]): T {
  disposables.push(resource);
  return resource;
}

function addMesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  rotX = 0,
  rotY = 0,
  rotZ = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rotX, rotY, rotZ);
  parent.add(mesh);
  return mesh;
}

function berthPoint(dockIndex: number, dockCount: number, target: THREE.Vector3): THREE.Vector3 {
  const along = dockCount === 1 ? 0 : dockIndex / (dockCount - 1) - 0.5;
  const side = dockIndex % 2 === 0 ? 1 : -1;
  return target.set(along * 1.2, 0.12, side * 0.2);
}

export function createCloudStation(position: THREE.Vector3, dockCount: number, disposables: Disposable[]): CloudStation {
  const hullTexture = canvasTexture(128, 32, (context) => {
    context.fillStyle = srgbHex("#e6e2da");
    context.fillRect(0, 0, 128, 32);
    context.fillStyle = srgbHex("#9aa0a6");
    context.fillRect(0, 11, 128, 12);
    context.fillStyle = srgbHex("#8fd4ea");
    for (let windowIndex = 0; windowIndex < 8; windowIndex += 1) context.fillRect(8 + windowIndex * 15, 14, 7, 6);
  }, disposables);
  const solarTexture = canvasTexture(64, 128, (context) => {
    context.fillStyle = srgbHex("#c6a15a");
    context.fillRect(0, 0, 64, 128);
    context.strokeStyle = srgbHex("#5c3d16");
    context.lineWidth = 2;
    for (let column = 1; column < 4; column += 1) {
      context.beginPath();
      context.moveTo((column * 64) / 4, 0);
      context.lineTo((column * 64) / 4, 128);
      context.stroke();
    }
    for (let row = 1; row < 8; row += 1) {
      context.beginPath();
      context.moveTo(0, (row * 128) / 8);
      context.lineTo(64, (row * 128) / 8);
      context.stroke();
    }
  }, disposables);
  const trussMaterial = keep(new THREE.MeshStandardMaterial({ color: "#8d9398", metalness: 0.82, roughness: 0.28 }), disposables);
  const moduleMaterial = keep(
    new THREE.MeshStandardMaterial({
      map: hullTexture,
      color: "#ffffff",
      metalness: 0.22,
      roughness: 0.42,
      emissive: "#38bdf8",
      emissiveIntensity: 0.04,
    }),
    disposables,
  );
  const solarMaterial = keep(
    new THREE.MeshStandardMaterial({
      map: solarTexture,
      color: "#ffffff",
      metalness: 0.45,
      roughness: 0.38,
      emissive: "#8a5a20",
      emissiveIntensity: 0.16,
    }),
    disposables,
  );
  const radiatorMaterial = keep(new THREE.MeshStandardMaterial({ color: "#f4f7f8", metalness: 0.12, roughness: 0.4 }), disposables);
  const cupolaMaterial = keep(
    new THREE.MeshStandardMaterial({ color: "#b9e4ef", metalness: 0.05, roughness: 0.08, transparent: true, opacity: 0.72 }),
    disposables,
  );
  const beaconMaterial = keep(
    new THREE.MeshStandardMaterial({ color: "#38bdf8", emissive: "#38bdf8", emissiveIntensity: 1.1 }),
    disposables,
  );
  const copyMaterial = keep(
    new THREE.MeshStandardMaterial({ color: "#ffa366", emissive: "#e87a2e", emissiveIntensity: 1.1 }),
    disposables,
  );
  const longeronGeometry = keep(new THREE.BoxGeometry(1.72, 0.018, 0.018), disposables);
  const battenGeometry = keep(new THREE.BoxGeometry(0.016, 0.16, 0.016), disposables);
  const braceGeometry = keep(new THREE.BoxGeometry(0.016, 0.016, 0.16), disposables);
  const labGeometry = keep(new THREE.CylinderGeometry(0.068, 0.068, 0.32, 20), disposables);
  const serviceGeometry = keep(new THREE.CylinderGeometry(0.058, 0.052, 0.28, 16), disposables);
  const nodeGeometry = keep(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 16), disposables);
  const sideGeometry = keep(new THREE.CylinderGeometry(0.046, 0.046, 0.22, 14), disposables);
  const boomGeometry = keep(new THREE.CylinderGeometry(0.007, 0.007, 1.28, 6), disposables);
  const arrayGeometry = keep(new THREE.BoxGeometry(0.22, 0.56, 0.016), disposables);
  const jointGeometry = keep(new THREE.CylinderGeometry(0.03, 0.03, 0.09, 8), disposables);
  const radiatorGeometry = keep(new THREE.BoxGeometry(0.014, 0.2, 0.42), disposables);
  const portGeometry = keep(new THREE.CylinderGeometry(0.018, 0.026, 0.05, 8), disposables);
  const copyGeometry = keep(new THREE.BoxGeometry(0.032, 0.01, 0.042), disposables);
  const armGeometry = keep(new THREE.BoxGeometry(0.26, 0.012, 0.012), disposables);
  const assembly = new THREE.Group();
  assembly.rotation.set(0.36, 0.62, 0.08);
  for (const [railY, railZ] of [[0.07, 0.07], [0.07, -0.07], [-0.07, 0.07], [-0.07, -0.07]] as const) {
    addMesh(assembly, longeronGeometry, trussMaterial, 0, railY, railZ);
  }
  addMesh(assembly, keep(new THREE.BoxGeometry(1.72, 0.03, 0.03), disposables), trussMaterial, 0, 0, 0);
  for (let battenIndex = 0; battenIndex < 7; battenIndex += 1) {
    const battenX = -0.78 + battenIndex * 0.26;
    addMesh(assembly, battenGeometry, trussMaterial, battenX, 0, 0);
    addMesh(assembly, braceGeometry, trussMaterial, battenX, 0, 0);
  }
  addMesh(assembly, nodeGeometry, moduleMaterial, 0, 0, 0.02, MODULE_AXIS, 0, 0);
  addMesh(assembly, labGeometry, moduleMaterial, 0, 0, 0.28, MODULE_AXIS, 0, 0);
  addMesh(assembly, serviceGeometry, moduleMaterial, 0, 0, -0.24, MODULE_AXIS, 0, 0);
  addMesh(assembly, sideGeometry, moduleMaterial, 0, 0.2, 0.08);
  addMesh(assembly, sideGeometry, moduleMaterial, 0, -0.2, -0.02);
  addMesh(assembly, keep(new THREE.SphereGeometry(0.046, 16, 12), disposables), cupolaMaterial, 0.14, -0.16, 0.2);
  addMesh(assembly, radiatorGeometry, radiatorMaterial, -0.26, -0.02, 0);
  addMesh(assembly, radiatorGeometry, radiatorMaterial, 0.26, -0.02, 0);
  addMesh(assembly, keep(new THREE.SphereGeometry(0.028, 12, 10), disposables), beaconMaterial, 0, 0.14, 0);
  const upperArm = addMesh(assembly, armGeometry, trussMaterial, 0.16, 0.16, 0.1);
  upperArm.rotation.z = 0.45;
  const forearm = addMesh(assembly, armGeometry, trussMaterial, 0.38, 0.24, 0.1);
  forearm.rotation.z = -0.7;
  const solarGimbals = WING_ANCHORS.map((anchorX) => {
    const gimbal = new THREE.Group();
    gimbal.position.set(anchorX, 0, 0);
    addMesh(gimbal, boomGeometry, trussMaterial, 0, 0, 0);
    addMesh(gimbal, arrayGeometry, solarMaterial, 0, 0.5, 0);
    addMesh(gimbal, arrayGeometry, solarMaterial, 0, -0.5, 0);
    addMesh(assembly, jointGeometry, trussMaterial, anchorX, 0, 0, 0, 0, MODULE_AXIS);
    assembly.add(gimbal);
    return gimbal;
  });
  const dockLocal = new THREE.Vector3();
  const copies = Array.from({ length: dockCount }, (_, dockIndex) => {
    berthPoint(dockIndex, dockCount, dockLocal);
    addMesh(assembly, portGeometry, trussMaterial, dockLocal.x, dockLocal.y, dockLocal.z, MODULE_AXIS, 0, 0);
    return addMesh(assembly, copyGeometry, copyMaterial, dockLocal.x, dockLocal.y + 0.04, dockLocal.z);
  });
  const label = createFileLabelSprite("cloud station", "node", 0.2, disposables);
  label.position.y = -1.05;
  const group = new THREE.Group();
  group.position.copy(position);
  group.add(assembly, label);
  group.updateMatrixWorld(true);

  return {
    group,
    docks: copies.map((copy) => copy.getWorldPosition(new THREE.Vector3())),
    update: (copyPresence, glow, elapsedSeconds, motionScale) => {
      moduleMaterial.emissiveIntensity = 0.04 + 0.1 * glow;
      beaconMaterial.emissiveIntensity = (0.45 + glow) * (0.65 + 0.35 * Math.sin(elapsedSeconds * 3 * motionScale));
      solarGimbals.forEach((gimbal, gimbalIndex) => {
        gimbal.rotation.x = Math.sin(elapsedSeconds * 0.12 * motionScale + gimbalIndex * 0.7) * 0.2;
      });
      copies.forEach((copy, dockIndex) => {
        const presence = copyPresence[dockIndex] ?? 0;
        copy.visible = presence > 0.01;
        copy.scale.setScalar(Math.max(presence, 0.001));
      });
    },
  };
}
