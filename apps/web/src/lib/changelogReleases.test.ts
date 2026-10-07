import { describe, expect, it } from "vitest";
import { rocketPositionForVersion } from "./changelogReleases";

describe("rocketPositionForVersion", () => {
  it.each([
    ["0.7.6", "assembly", "On the pad", 2.6],
    ["0.7.99", "assembly", "On the pad", 2.6],
    ["0.8.0", "liftoff", "Liftoff", 3.25],
    ["0.8.4", "liftoff", "Liftoff", 3.25],
    ["0.9.0", "ascent", "Orbit insertion", 5],
    ["0.10.0", "ascent", "Orbit insertion", 5],
    ["1.0.0", "orbit", "Stable orbit", 6],
    ["1.0.1", "beyond", "Deep space", 7],
    ["1.1.0", "beyond", "Deep space", 7],
  ] as const)("places %s in %s (%s) at mission %s", (version, phase, phaseLabel, mission) => {
    expect(rocketPositionForVersion(version)).toEqual({ phase, phaseLabel, mission });
  });
});
