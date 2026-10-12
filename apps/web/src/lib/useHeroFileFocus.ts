import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import gsap from "gsap";
import type { JourneyState, LandingJourneyScene } from "../scenes/landingJourneyScene";
import { SYNCED_FILES } from "./syncedFiles";

export type HeroFileFocus = {
  focusedItemId: string | null;
  openItem: (itemId: string | null, opener: HTMLElement | null) => void;
  stepItem: (direction: 1 | -1) => void;
  closeItem: () => void;
};

const CARD_GAP = 96;
const VIEWPORT_MARGIN = 16;

function focusMotionScale(): number {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1;
}

export function useHeroFileFocus(
  journeyStateRef: RefObject<JourneyState>,
  journeyScene: LandingJourneyScene | null,
  cardRef: RefObject<HTMLElement | null>,
): HeroFileFocus {
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const focusTweenRef = useRef<gsap.core.Tween | null>(null);
  const switchTweenRef = useRef<gsap.core.Tween | null>(null);

  const closeItem = useCallback(() => {
    const journeyState = journeyStateRef.current;
    if (!journeyState.focusedItemId) return;
    focusTweenRef.current?.kill();
    switchTweenRef.current?.kill();
    setFocusedItemId(null);
    focusTweenRef.current = gsap.to(journeyState, {
      focus: 0,
      duration: 0.8 * focusMotionScale(),
      ease: "power2.inOut",
      onComplete: () => {
        journeyState.focusedItemId = null;
        journeyState.switchFromItemId = null;
      },
    });
    openerRef.current?.focus({ preventScroll: true });
    openerRef.current = null;
  }, [journeyStateRef]);

  const openItem = useCallback(
    (itemId: string | null, opener: HTMLElement | null) => {
      const journeyState = journeyStateRef.current;
      if (!itemId) {
        closeItem();
        return;
      }
      const previousItemId = journeyState.focusedItemId;
      if (opener) openerRef.current = opener;
      setFocusedItemId(itemId);
      journeyState.focusedItemId = itemId;
      if (previousItemId && previousItemId !== itemId && journeyState.focus > 0) {
        switchTweenRef.current?.kill();
        journeyState.switchFromItemId = previousItemId;
        switchTweenRef.current = gsap.fromTo(
          journeyState,
          { focusSwitch: 0 },
          {
            focusSwitch: 1,
            duration: 0.9 * focusMotionScale(),
            ease: "none",
            onComplete: () => {
              journeyState.switchFromItemId = null;
            },
          },
        );
      }
      focusTweenRef.current?.kill();
      focusTweenRef.current = gsap.to(journeyState, {
        focus: 1,
        duration: 1.2 * focusMotionScale(),
        ease: "power2.inOut",
      });
    },
    [journeyStateRef, closeItem],
  );

  const stepItem = useCallback(
    (direction: 1 | -1) => {
      const currentIndex = SYNCED_FILES.findIndex((syncedFile) => syncedFile.id === journeyStateRef.current.focusedItemId);
      const nextIndex = (currentIndex + direction + SYNCED_FILES.length) % SYNCED_FILES.length;
      openItem(SYNCED_FILES[nextIndex].id, null);
    },
    [journeyStateRef, openItem],
  );

  useEffect(() => {
    if (!focusedItemId || !journeyScene) return;
    const followFocusedItem = () => {
      const card = cardRef.current;
      const itemPoint = journeyScene.projectItem(focusedItemId);
      if (!card || !itemPoint) return;
      const maxLeft = window.innerWidth - card.offsetWidth - VIEWPORT_MARGIN;
      const maxTop = window.innerHeight - card.offsetHeight - VIEWPORT_MARGIN;
      const left = gsap.utils.clamp(VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, maxLeft), itemPoint.x + CARD_GAP);
      const top = gsap.utils.clamp(VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, maxTop), itemPoint.y - card.offsetHeight / 2);
      card.style.transform = `translate(${left}px, ${top}px)`;
    };
    gsap.ticker.add(followFocusedItem);
    return () => gsap.ticker.remove(followFocusedItem);
  }, [focusedItemId, journeyScene, cardRef]);

  useEffect(() => {
    if (!focusedItemId) return;
    const closeOnEscape = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") closeItem();
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("scroll", closeItem, { passive: true });
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("scroll", closeItem);
    };
  }, [focusedItemId, closeItem]);

  useEffect(
    () => () => {
      focusTweenRef.current?.kill();
      switchTweenRef.current?.kill();
    },
    [],
  );

  return { focusedItemId, openItem, stepItem, closeItem };
}
