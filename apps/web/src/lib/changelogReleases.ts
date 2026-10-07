export type RocketPhase = "assembly" | "liftoff" | "ascent" | "orbit" | "beyond";

export type ExtensionReleaseSection = { heading: string; items: string[] };

export type ExtensionRelease = { version: string; sections: ExtensionReleaseSection[] };

export type ExtensionChangelog = {
  fetchedAt: string;
  latest: string | null;
  releases: ExtensionRelease[];
};

export type RocketPosition = { phase: RocketPhase; phaseLabel: string; mission: number };

function compareVersions(left: string, right: string): number {
  const [leftMajor = 0, leftMinor = 0, leftPatch = 0] = left.split(".").map(Number);
  const [rightMajor = 0, rightMinor = 0, rightPatch = 0] = right.split(".").map(Number);
  return leftMajor - rightMajor || leftMinor - rightMinor || leftPatch - rightPatch;
}

export function rocketPositionForVersion(version: string): RocketPosition {
  if (compareVersions(version, "0.8.0") < 0) {
    return { phase: "assembly", phaseLabel: "On the pad", mission: 2.6 };
  }
  if (compareVersions(version, "0.9.0") < 0) {
    return { phase: "liftoff", phaseLabel: "Liftoff", mission: 3.25 };
  }
  if (compareVersions(version, "1.0.0") < 0) {
    return { phase: "ascent", phaseLabel: "Orbit insertion", mission: 5 };
  }
  if (compareVersions(version, "1.0.0") === 0) {
    return { phase: "orbit", phaseLabel: "Stable orbit", mission: 6 };
  }
  return { phase: "beyond", phaseLabel: "Deep space", mission: 7 };
}
