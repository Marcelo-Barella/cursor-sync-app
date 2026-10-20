import * as THREE from "three";

export type CameraShot = { position: THREE.Vector3; look: THREE.Vector3 };

const ESTABLISHING_SHOT: CameraShot = { position: new THREE.Vector3(-2.2, 1.1, 8.4), look: new THREE.Vector3(-2.4, 0.2, 0) };
const WIDE_SHOT: CameraShot = { position: new THREE.Vector3(0.4, 1.8, 13.6), look: new THREE.Vector3(0.4, 0.4, 0) };
const ESTABLISHING_ASPECT = 1.1;
const WIDE_ASPECT = 1.75;
const CHASE_ASPECT = 1.15;
const CHASE_OFFSET = new THREE.Vector3(0.2, 0.48, 2.35);
const chasePosition = new THREE.Vector3();
const fittedAnchor = { position: new THREE.Vector3(), look: new THREE.Vector3() };

function smoothUnit(amount: number): number {
  const clamped = THREE.MathUtils.clamp(amount, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function flightZoom(story: number): number {
  if (story < 2) return smoothUnit((story - 1) / 0.18);
  const download = story - 2;
  if (download < 0.78) return 1;
  return 1 - smoothUnit((download - 0.78) / 0.22);
}

function fitAnchor(shot: CameraShot, shotAspect: number, viewAspect: number): CameraShot {
  const narrowFit = Math.max(1, shotAspect / viewAspect);
  fittedAnchor.look.copy(shot.look);
  fittedAnchor.position.copy(shot.position).sub(shot.look).multiplyScalar(narrowFit).add(shot.look);
  return fittedAnchor;
}

export function storyFlightShot(story: number, viewAspect: number, flightFocus: THREE.Vector3, target: CameraShot): CameraShot {
  const zoom = flightZoom(story);
  const wide = story >= 2;
  const anchor = fitAnchor(wide ? WIDE_SHOT : ESTABLISHING_SHOT, wide ? WIDE_ASPECT : ESTABLISHING_ASPECT, viewAspect);
  const chaseDistance = Math.max(1, CHASE_ASPECT / viewAspect);
  chasePosition.copy(flightFocus).addScaledVector(CHASE_OFFSET, chaseDistance);
  const blend = wide ? 1 - zoom : zoom;
  target.position.lerpVectors(wide ? chasePosition : anchor.position, wide ? anchor.position : chasePosition, blend);
  target.look.lerpVectors(wide ? flightFocus : anchor.look, wide ? anchor.look : flightFocus, blend);
  return target;
}
