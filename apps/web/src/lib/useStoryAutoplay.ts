import { useCallback, useEffect, useState } from "react";
import { SYNC_STEPS, nextAutoplayStatus, type AutoplayEvent, type AutoplayStatus } from "./syncStoryTimeline";

export type StoryAutoplay = {
  status: AutoplayStatus;
  toggle: () => void;
  selectStep: (stepIndex: number) => void;
};

export const AUTOPLAY_CONTROL_SELECTOR = "[data-autoplay-control]";

const QUIET_MILLISECONDS = 2000;
const STEP_HOLD_MILLISECONDS = 5000;
const USER_INPUT_EVENTS = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useStoryAutoplay(
  storyStepIndex: number | null,
  scrollToStep: (stepIndex: number, onInterrupted: (() => void) | null) => void,
): StoryAutoplay {
  const [status, setStatus] = useState<AutoplayStatus>("idle");
  const dispatch = useCallback((event: AutoplayEvent) => {
    setStatus((currentStatus) => nextAutoplayStatus(currentStatus, event));
  }, []);
  const storyActive = storyStepIndex !== null;

  useEffect(() => {
    dispatch(storyActive ? "story-entered" : "story-left");
  }, [storyActive, dispatch]);

  useEffect(() => {
    const stopOnUserInput = (inputEvent: Event) => {
      if (inputEvent.target instanceof Element && inputEvent.target.closest(AUTOPLAY_CONTROL_SELECTOR)) return;
      dispatch("user-input");
    };
    const pauseWhenHidden = () => {
      if (document.hidden) dispatch("tab-hidden");
    };
    USER_INPUT_EVENTS.forEach((eventName) => window.addEventListener(eventName, stopOnUserInput, { passive: true }));
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => {
      USER_INPUT_EVENTS.forEach((eventName) => window.removeEventListener(eventName, stopOnUserInput));
      document.removeEventListener("visibilitychange", pauseWhenHidden);
    };
  }, [dispatch]);

  useEffect(() => {
    if (status !== "waiting" || prefersReducedMotion()) return;
    let quietTimer = 0;
    const restartQuietTimer = () => {
      window.clearTimeout(quietTimer);
      if (!document.hidden) quietTimer = window.setTimeout(() => dispatch("quiet-elapsed"), QUIET_MILLISECONDS);
    };
    restartQuietTimer();
    window.addEventListener("scroll", restartQuietTimer, { passive: true });
    document.addEventListener("visibilitychange", restartQuietTimer);
    return () => {
      window.clearTimeout(quietTimer);
      window.removeEventListener("scroll", restartQuietTimer);
      document.removeEventListener("visibilitychange", restartQuietTimer);
    };
  }, [status, dispatch]);

  useEffect(() => {
    if (status !== "playing" || storyStepIndex === null) return;
    const holdTimer = window.setTimeout(() => {
      if (storyStepIndex >= SYNC_STEPS.length - 1) {
        dispatch("last-step-held");
        return;
      }
      scrollToStep(storyStepIndex + 1, () => dispatch("scroll-killed"));
    }, STEP_HOLD_MILLISECONDS);
    return () => window.clearTimeout(holdTimer);
  }, [status, storyStepIndex, scrollToStep, dispatch]);

  const toggle = useCallback(() => dispatch("toggle"), [dispatch]);
  const selectStep = useCallback(
    (stepIndex: number) => {
      dispatch("step-selected");
      scrollToStep(stepIndex, null);
    },
    [dispatch, scrollToStep],
  );
  return { status, toggle, selectStep };
}
