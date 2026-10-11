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

const ASSEMBLY_DONE = 2.6;
const LAST_ASSEMBLY_MINOR = 7;

function assemblyMission(version: string): number {
  const minor = Number(version.split(".")[1] ?? 0);
  const step = Math.min(Math.max(Number.isFinite(minor) ? minor : 0, 0), LAST_ASSEMBLY_MINOR);
  return (step / LAST_ASSEMBLY_MINOR) * ASSEMBLY_DONE;
}

export function rocketPositionForVersion(version: string): RocketPosition {
  if (compareVersions(version, "0.8.0") < 0) {
    return { phase: "assembly", phaseLabel: "On the pad", mission: assemblyMission(version) };
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
