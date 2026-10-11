export type SyncStep = {
  number: string;
  title: string;
  detail: string;
};

export type AutoplayStatus = "idle" | "waiting" | "playing" | "stopped";

export type AutoplayEvent =
  | "story-entered"
  | "story-left"
  | "quiet-elapsed"
  | "last-step-held"
  | "user-input"
  | "scroll-killed"
  | "step-selected"
  | "tab-hidden"
  | "toggle";

export const SYNC_STEPS: readonly SyncStep[] = [
  {
    number: "01",
    title: "Install",
    detail: "Add Cursor Sync to Cursor. Your setup is the little world of files around your computer.",
  },
  {
    number: "02",
    title: "Secret word",
    detail: "Pick a passphrase. Only you know it, and every copy is locked with it.",
  },
  {
    number: "03",
    title: "Copy up",
    detail: "Cursor Sync sends copies to a safe spot in the cloud. Your originals stay right where they are.",
  },
  {
    number: "04",
    title: "Copy down",
    detail: "Your other computer uses the same passphrase to get the copies. Now both match.",
  },
];

export const SYNC_STEP_LABELS = ["step1", "step2", "step3", "step4"] as const;

export const JOURNEY_SEGMENTS = { hero: 0.4, handoff: 1, step: 1, tail: 0.4 } as const;

export const JOURNEY_LENGTH =
  JOURNEY_SEGMENTS.hero +
  JOURNEY_SEGMENTS.handoff +
  JOURNEY_SEGMENTS.step * (SYNC_STEP_LABELS.length - 1) +
  JOURNEY_SEGMENTS.tail;

export const ROCKET_STAGGER = 0.06;

function clampUnit(amount: number): number {
  return Math.min(1, Math.max(0, amount));
}

export function stepIndexAtStory(storyProgress: number): number {
  return Math.min(SYNC_STEP_LABELS.length - 1, Math.max(0, Math.round(storyProgress)));
}

export function storyLegProgress(storyProgress: number, legIndex: 1 | 2): number {
  return clampUnit(storyProgress - legIndex);
}

export function rocketLegProgress(legProgress: number, rocketIndex: number, rocketCount: number, stagger: number): number {
  const flightShare = 1 - stagger * (rocketCount - 1);
  return clampUnit((legProgress - stagger * rocketIndex) / flightShare);
}

export function nextAutoplayStatus(status: AutoplayStatus, event: AutoplayEvent): AutoplayStatus {
  switch (event) {
    case "story-entered":
      return status === "idle" ? "waiting" : status;
    case "story-left":
      return "idle";
    case "quiet-elapsed":
      return status === "waiting" ? "playing" : status;
    case "last-step-held":
    case "user-input":
    case "scroll-killed":
      return status === "playing" ? "stopped" : status;
    case "step-selected":
      return status === "idle" ? status : "stopped";
    case "tab-hidden":
      return status === "playing" ? "waiting" : status;
    case "toggle":
      return status === "playing" ? "stopped" : "playing";
  }
}
