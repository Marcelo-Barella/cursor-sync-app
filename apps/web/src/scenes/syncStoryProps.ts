import * as THREE from "three";
import gsap from "gsap";
import type { Disposable } from "./sceneStage";
import { OBSIDIAN_PLANET_PALETTE, createGlowMaterial, createPlanetSurfaceTexture } from "./celestialBodies";
import { createFileLabelSprite } from "./orbitFileLabel";

export type SyncRelay = {
  group: THREE.Group;
  panX: number;
  travelPoint: (
    departure: THREE.Vector3,
    fileTransit: number,
    fileIndex: number,
    fileCount: number,
    elapsedSeconds: number,
    target: THREE.Vector3,
  ) => THREE.Vector3;
  update: (transit: number, elapsedSeconds: number) => void;
};

const R2_POSITION = new THREE.Vector3(3.4, 1.3, -0.4);
const PEER_POSITION = new THREE.Vector3(6.5, -0.45, 0);
const PEER_ORBIT_RADIUS = 1.05;
const UPLOAD_ARC_LIFT = new THREE.Vector3(0, 1.4, 0);
const DOWNLOAD_ARC_LIFT = new THREE.Vector3(0, 1.1, 0);
const easeInOut = gsap.parseEase("power2.inOut");
const easeOutBack = gsap.parseEase("back.out(1.7)");

function quadraticPoint(
  start: THREE.Vector3,
  control: THREE.Vector3,
  end: THREE.Vector3,
  progress: number,
  target: THREE.Vector3,
): THREE.Vector3 {
  const inverse = 1 - progress;
  return target
    .copy(start)
    .multiplyScalar(inverse * inverse)
    .addScaledVector(control, 2 * inverse * progress)
    .addScaledVector(end, progress * progress);
}

export function createPassphraseKey(disposables: Disposable[]): THREE.Group {
  const keyMaterial = new THREE.MeshStandardMaterial({
    color: "#ffd7af",
    emissive: "#ffa366",
    emissiveIntensity: 1.3,
    metalness: 0.7,
    roughness: 0.3,
  });
  const bowGeometry = new THREE.TorusGeometry(0.11, 0.035, 12, 32);
  const shaftGeometry = new THREE.CylinderGeometry(0.026, 0.026, 0.34, 12);
  const toothGeometry = new THREE.BoxGeometry(0.08, 0.035, 0.03);
  const haloGeometry = new THREE.RingGeometry(0.22, 0.235, 64);
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: "#e87a2e",
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  disposables.push(keyMaterial, bowGeometry, shaftGeometry, toothGeometry, haloGeometry, haloMaterial);

  const bow = new THREE.Mesh(bowGeometry, keyMaterial);
  bow.position.y = 0.13;
  const shaft = new THREE.Mesh(shaftGeometry, keyMaterial);
  shaft.position.y = -0.12;
  const lowerTooth = new THREE.Mesh(toothGeometry, keyMaterial);
  lowerTooth.position.set(0.05, -0.24, 0);
  const upperTooth = new THREE.Mesh(toothGeometry, keyMaterial);
  upperTooth.position.set(0.04, -0.16, 0);
  const halo = new THREE.Mesh(haloGeometry, haloMaterial);
  halo.position.y = 0.13;

  const passphraseKey = new THREE.Group();
  passphraseKey.add(bow, shaft, lowerTooth, upperTooth, halo);
  return passphraseKey;
}

function createR2Bucket(disposables: Disposable[]): THREE.Group {
  const platterGeometry = new THREE.CylinderGeometry(0.46, 0.46, 0.11, 48);
  const platterMaterial = new THREE.MeshStandardMaterial({ color: "#201f22", metalness: 0.6, roughness: 0.35 });
  const seamGeometry = new THREE.TorusGeometry(0.465, 0.012, 8, 64);
  const seamMaterial = new THREE.MeshBasicMaterial({ color: "#38bdf8", transparent: true, opacity: 0.9 });
  disposables.push(platterGeometry, platterMaterial, seamGeometry, seamMaterial);
  const bucket = new THREE.Group();
  [-0.2, 0, 0.2].forEach((platterHeight) => {
    const platter = new THREE.Mesh(platterGeometry, platterMaterial);
    platter.position.y = platterHeight;
    const seam = new THREE.Mesh(seamGeometry, seamMaterial);
    seam.rotation.x = Math.PI / 2;
    seam.position.y = platterHeight + 0.055;
    bucket.add(platter, seam);
  });
  bucket.rotation.x = 0.35;
  return bucket;
}

function createPeerMachine(disposables: Disposable[]): THREE.Group {
  const peerGeometry = new THREE.SphereGeometry(0.5, 48, 48);
  const peerTexture = createPlanetSurfaceTexture(OBSIDIAN_PLANET_PALETTE, 7.3);
  const peerMaterial = new THREE.MeshStandardMaterial({ map: peerTexture, roughness: 0.8, metalness: 0.1 });
  const peerRimMaterial = createGlowMaterial("rim", "#64dcff", 0.9);
  disposables.push(peerGeometry, peerTexture, peerMaterial, peerRimMaterial);
  const peerMachine = new THREE.Group();
  const peerRim = new THREE.Mesh(peerGeometry, peerRimMaterial);
  peerRim.scale.setScalar(1.01);
  peerMachine.add(new THREE.Mesh(peerGeometry, peerMaterial), peerRim);
  return peerMachine;
}

export function createSyncRelay(disposables: Disposable[]): SyncRelay {
  const relayGroup = new THREE.Group();
  const bucket = createR2Bucket(disposables);
  bucket.position.copy(R2_POSITION);
  const r2Label = createFileLabelSprite("cloudflare r2 · ciphertext only", "node", 0.22, disposables);
  r2Label.position.copy(R2_POSITION).add(new THREE.Vector3(0, -0.72, 0));

  const peerMachine = createPeerMachine(disposables);
  peerMachine.position.copy(PEER_POSITION);
  const peerLabel = createFileLabelSprite("machine 02", "node", 0.22, disposables);
  peerLabel.position.copy(PEER_POSITION).add(new THREE.Vector3(0, -1.45, 0));
  const peerKey = createPassphraseKey(disposables);
  peerKey.position.copy(PEER_POSITION).add(new THREE.Vector3(0, 0.82, 0));

  const routeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.1, 0.4, 0),
    new THREE.Vector3(2.3, 1.5, -0.2),
    R2_POSITION.clone(),
    new THREE.Vector3(5.1, 0.9, -0.2),
    PEER_POSITION.clone().add(new THREE.Vector3(-0.6, 0.1, 0)),
  ]);
  const routeGeometry = new THREE.BufferGeometry().setFromPoints(routeCurve.getPoints(120));
  const routeMaterial = new THREE.LineDashedMaterial({
    color: "#c0c1ff",
    dashSize: 0.1,
    gapSize: 0.08,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  disposables.push(routeGeometry, routeMaterial);
  const routeLine = new THREE.Line(routeGeometry, routeMaterial);
  routeLine.computeLineDistances();

  relayGroup.add(bucket, r2Label, peerMachine, peerLabel, peerKey, routeLine);
  const fadingSprites = [r2Label, peerLabel];
  const r2Slot = new THREE.Vector3();
  const peerSlot = new THREE.Vector3();
  const lift = new THREE.Vector3();

  return {
    group: relayGroup,
    panX: 3.25,
    travelPoint: (departure, fileTransit, fileIndex, fileCount, elapsedSeconds, target) => {
      const slotAngle = (fileIndex / fileCount) * Math.PI * 2;
      r2Slot.copy(R2_POSITION).add(lift.set(Math.cos(slotAngle) * 0.62, 0.34 + Math.sin(slotAngle) * 0.12, Math.sin(slotAngle) * 0.3));
      if (fileTransit < 0.5) {
        const control = lift.copy(departure).lerp(r2Slot, 0.5).add(UPLOAD_ARC_LIFT);
        return quadraticPoint(departure, control, r2Slot, easeInOut(fileTransit / 0.5), target);
      }
      if (fileTransit < 0.6) {
        return target.copy(r2Slot).setY(r2Slot.y + Math.sin(elapsedSeconds * 3 + fileIndex) * 0.03);
      }
      const peerAngle = elapsedSeconds * 0.3 + slotAngle;
      peerSlot.copy(PEER_POSITION).add(lift.set(Math.cos(peerAngle) * PEER_ORBIT_RADIUS, Math.sin(peerAngle) * 0.35, Math.sin(peerAngle) * PEER_ORBIT_RADIUS));
      const control = lift.copy(r2Slot).lerp(peerSlot, 0.5).add(DOWNLOAD_ARC_LIFT);
      return quadraticPoint(r2Slot, control, peerSlot, easeInOut((fileTransit - 0.6) / 0.4), target);
    },
    update: (transit, elapsedSeconds) => {
      const relayVisibility = THREE.MathUtils.clamp(transit * 4, 0, 1);
      relayGroup.visible = relayVisibility > 0.001;
      relayGroup.scale.setScalar(0.85 + 0.15 * relayVisibility);
      routeMaterial.opacity = relayVisibility * 0.55;
      fadingSprites.forEach((sprite) => {
        sprite.material.opacity = relayVisibility;
      });
      bucket.rotation.y = elapsedSeconds * 0.4;
      peerMachine.rotation.y = elapsedSeconds * 0.1;
      peerKey.scale.setScalar(0.75 * easeOutBack(THREE.MathUtils.clamp((transit - 0.72) / 0.28, 0, 1)));
      peerKey.rotation.y = elapsedSeconds * 0.8;
    },
  };
}
