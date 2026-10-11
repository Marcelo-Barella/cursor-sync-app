import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { LABEL_CLEARANCE_RADIUS, createFileOrbitLayout, placeOrbitItem, placeOrbitLabel } from "./fileOrbitLayout";

function itemPositionAt(seed: number, itemIndex: number, orbitClock: number): number[] {
  const position = new THREE.Vector3();
  placeOrbitItem(createFileOrbitLayout(10, seed), itemIndex, orbitClock, position, new THREE.Vector3());
  return position.toArray();
}

describe("file orbit layout", () => {
  it("places every item at the same point for the same seed", () => {
    for (let itemIndex = 0; itemIndex < 10; itemIndex += 1) {
      expect(itemPositionAt(7, itemIndex, 3.2)).toEqual(itemPositionAt(7, itemIndex, 3.2));
    }
  });

  it("changes the layout when the seed changes", () => {
    expect(itemPositionAt(7, 0, 0)).not.toEqual(itemPositionAt(8, 0, 0));
  });

  it("spreads ten items over four lanes that turn both ways", () => {
    const layout = createFileOrbitLayout(10, 7);
    expect(layout.lanes).toHaveLength(4);
    expect(new Set(layout.slots.map((slot) => slot.laneIndex)).size).toBe(4);
    expect(new Set(layout.lanes.map((lane) => lane.direction))).toEqual(new Set([1, -1]));
  });

  it("keeps every item outside the planet plus label clearance at all times", () => {
    const layout = createFileOrbitLayout(10, 20261007);
    const position = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    for (let orbitClock = 0; orbitClock < 60; orbitClock += 0.5) {
      for (let itemIndex = 0; itemIndex < 10; itemIndex += 1) {
        placeOrbitItem(layout, itemIndex, orbitClock, position, tangent);
        expect(position.length()).toBeGreaterThanOrEqual(LABEL_CLEARANCE_RADIUS);
        expect(Math.abs(tangent.dot(position))).toBeLessThan(1e-9);
      }
    }
  });

  it("pushes a label off the planet disk when its item crosses in front of the planet", () => {
    const label = new THREE.Object3D();
    const itemPosition = new THREE.Vector3(0.3, 0, 1.9);
    placeOrbitLabel(label, itemPosition, new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 10));
    const labelDiskDistance = Math.hypot(label.position.x, label.position.y);
    expect(labelDiskDistance).toBeGreaterThan(Math.hypot(itemPosition.x, itemPosition.y) + 0.3);
  });

  it("regression: label clears the planet disk when its item crosses near the disk center", () => {
    const label = new THREE.Object3D();
    placeOrbitLabel(label, new THREE.Vector3(0.05, 0, 1.9), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 10));
    expect(Math.hypot(label.position.x, label.position.y)).toBeGreaterThanOrEqual(LABEL_CLEARANCE_RADIUS - 1e-9);
  });
});
