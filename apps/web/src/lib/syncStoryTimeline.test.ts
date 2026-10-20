import { describe, expect, it } from "vitest";
import {
  JOURNEY_LENGTH,
  ROCKET_STAGGER,
  SYNC_STEPS,
  SYNC_STEP_LABELS,
  nextAutoplayStatus,
  rocketLegProgress,
  stepIndexAtStory,
  storyLegProgress,
  type AutoplayEvent,
  type AutoplayStatus,
} from "./syncStoryTimeline";

const ROCKET_COUNT = 10;

function runAutoplay(status: AutoplayStatus, events: readonly AutoplayEvent[]): AutoplayStatus {
  return events.reduce(nextAutoplayStatus, status);
}

describe("sync story steps", () => {
  it("has one timeline label per step", () => {
    expect(SYNC_STEP_LABELS).toHaveLength(SYNC_STEPS.length);
  });

  it("maps story progress to the nearest step label", () => {
    expect([-1, 0, 0.49, 0.5, 1.4, 2.6, 3, 9].map((story) => stepIndexAtStory(story))).toEqual([0, 0, 0, 1, 1, 3, 3, 3]);
  });

  it("pins the journey for hero, handoff, three step moves, and a tail", () => {
    expect(JOURNEY_LENGTH).toBeCloseTo(4.8, 10);
  });
});

describe("rocket leg progress", () => {
  it("is 0 before the leg and 1 after it for every rocket", () => {
    for (let rocketIndex = 0; rocketIndex < ROCKET_COUNT; rocketIndex += 1) {
      expect(rocketLegProgress(0, rocketIndex, ROCKET_COUNT, ROCKET_STAGGER)).toBe(0);
      expect(rocketLegProgress(1, rocketIndex, ROCKET_COUNT, ROCKET_STAGGER)).toBe(1);
    }
  });

  it("never moves backward while the story moves forward", () => {
    for (let rocketIndex = 0; rocketIndex < ROCKET_COUNT; rocketIndex += 1) {
      let previousFlight = 0;
      for (let story = 0; story <= 3; story += 0.01) {
        const flight = rocketLegProgress(storyLegProgress(story, 1), rocketIndex, ROCKET_COUNT, ROCKET_STAGGER);
        expect(flight).toBeGreaterThanOrEqual(previousFlight);
        previousFlight = flight;
      }
    }
  });

  it("launches later rockets after earlier ones", () => {
    const midLeg = [0, 4, 9].map((rocketIndex) => rocketLegProgress(0.5, rocketIndex, ROCKET_COUNT, ROCKET_STAGGER));
    expect(midLeg[0]).toBeGreaterThan(midLeg[1]);
    expect(midLeg[1]).toBeGreaterThan(midLeg[2]);
  });

  it("keeps the upload leg inside step 03 and the download leg inside step 04", () => {
    expect(storyLegProgress(1, 1)).toBe(0);
    expect(storyLegProgress(2, 1)).toBe(1);
    expect(storyLegProgress(2, 2)).toBe(0);
    expect(storyLegProgress(3, 2)).toBe(1);
  });
});

describe("story autoplay", () => {
  it("waits when the story starts and plays after a quiet pause", () => {
    expect(runAutoplay("idle", ["story-entered"])).toBe("waiting");
    expect(runAutoplay("idle", ["story-entered", "quiet-elapsed"])).toBe("playing");
  });

  it("stops playing on user input", () => {
    expect(runAutoplay("playing", ["user-input"])).toBe("stopped");
  });

  it("keeps waiting through user input so scrolling only restarts the quiet timer", () => {
    expect(runAutoplay("waiting", ["user-input"])).toBe("waiting");
  });

  it("stops when the user kills the scroll tween", () => {
    expect(runAutoplay("playing", ["scroll-killed"])).toBe("stopped");
  });

  it("stops waiting or playing when the user picks a step", () => {
    expect(runAutoplay("waiting", ["step-selected"])).toBe("stopped");
    expect(runAutoplay("playing", ["step-selected"])).toBe("stopped");
    expect(runAutoplay("idle", ["step-selected"])).toBe("idle");
  });

  it("stops after holding the last step and never loops", () => {
    expect(runAutoplay("playing", ["last-step-held", "quiet-elapsed"])).toBe("stopped");
  });

  it("pauses to waiting when the tab is hidden", () => {
    expect(runAutoplay("playing", ["tab-hidden"])).toBe("waiting");
  });

  it("resets to idle when the story segment is left", () => {
    expect(runAutoplay("stopped", ["story-left"])).toBe("idle");
    expect(runAutoplay("playing", ["story-left"])).toBe("idle");
  });

  it("toggles between playing and stopped from the play button", () => {
    expect(runAutoplay("stopped", ["toggle"])).toBe("playing");
    expect(runAutoplay("waiting", ["toggle"])).toBe("playing");
    expect(runAutoplay("playing", ["toggle"])).toBe("stopped");
  });

  it("ignores a quiet pause outside the story", () => {
    expect(runAutoplay("idle", ["quiet-elapsed"])).toBe("idle");
  });
});
