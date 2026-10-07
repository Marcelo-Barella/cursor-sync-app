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

export type ChangelogRelease = {
  version: string;
  summary: string;
  phase: RocketPhase;
  phaseLabel: string;
  rocketPart: string;
};

export const CHANGELOG_RELEASES: readonly ChangelogRelease[] = [
  {
    version: "1.1.0",
    summary: "The same rocket is only going farther. No new parts.",
    phase: "beyond",
    phaseLabel: "Deep space",
    rocketPart: "no new parts",
  },
  {
    version: "1.0.0",
    summary: "The rocket is stable in orbit.",
    phase: "orbit",
    phaseLabel: "Stable orbit",
    rocketPart: "engines idle",
  },
  {
    version: "0.9.0",
    summary: "The rocket is above the atmosphere, curving into orbit, planet below.",
    phase: "ascent",
    phaseLabel: "Orbit insertion",
    rocketPart: "gravity turn",
  },
  {
    version: "0.8.0",
    summary: "The same rocket is lifting off, flame under it, still near the pad.",
    phase: "liftoff",
    phaseLabel: "Liftoff",
    rocketPart: "ignition",
  },
  {
    version: "0.7.0",
    summary: "The R2 tank.",
    phase: "assembly",
    phaseLabel: "On the pad",
    rocketPart: "+ tank stage, fins",
  },
  {
    version: "0.5.0",
    summary: "Local encryption.",
    phase: "assembly",
    phaseLabel: "On the pad",
    rocketPart: "+ sealed hull",
  },
  {
    version: "0.3.0",
    summary: "The passphrase.",
    phase: "assembly",
    phaseLabel: "On the pad",
    rocketPart: "+ nose, key window",
  },
  {
    version: "0.1.0",
    summary: "The frame.",
    phase: "assembly",
    phaseLabel: "On the pad",
    rocketPart: "+ frame",
  },
];

export const LATEST_RELEASE_VERSION = CHANGELOG_RELEASES[0]?.version ?? "0.0.0";

export function missionForReleaseIndex(releaseIndex: number): number {
  return CHANGELOG_RELEASES.length - 1 - releaseIndex;
}
