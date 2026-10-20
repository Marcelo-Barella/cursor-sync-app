import * as THREE from "three";
import { createSoftDotTexture } from "./celestialBodies";
import type { Disposable } from "./sceneStage";

export type RocketParts = {
  hull: THREE.LatheGeometry;
  nose: THREE.ConeGeometry;
  fin: THREE.BoxGeometry;
  hullMaterial: THREE.MeshStandardMaterial;
  trimMaterial: THREE.MeshStandardMaterial;
  exhaustTexture: THREE.CanvasTexture;
  exhaustMaterial: THREE.SpriteMaterial;
};

export function createRocketParts(disposables: Disposable[]): RocketParts {
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

export function createRocketBody(parts: RocketParts): { body: THREE.Group; exhaust: THREE.Sprite } {
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
