import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FileFocusCard } from "../components/FileFocusCard";
import { HowItSyncsSection } from "../components/HowItSyncsSection";
import { WhatElseSection } from "../components/WhatElseSection";
import { Nav } from "../components/Nav";
import { SiteFooter } from "../components/SiteFooter";
import { EXTENSION_LISTING_URL } from "../lib/defaults";
import { SYNCED_FILES } from "../lib/syncedFiles";
import { JOURNEY_LENGTH, JOURNEY_SEGMENTS, SYNC_STEP_LABELS, stepIndexAtStory } from "../lib/syncStoryTimeline";
import { useHeroFileFocus } from "../lib/useHeroFileFocus";
import { useStoryAutoplay } from "../lib/useStoryAutoplay";
import type { JourneyState, LandingJourneyScene } from "../scenes/landingJourneyScene";
import { useLazyScene, type SceneLoader } from "../scenes/useLazyScene";
import "./LandingPage.css";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const STORY_HASH = "#how-it-syncs";

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LandingPage() {
  const landingRef = useRef<HTMLDivElement>(null);
  const journeyRef = useRef<HTMLElement>(null);
  const journeyStageRef = useRef<HTMLDivElement>(null);
  const journeyHostRef = useRef<HTMLDivElement>(null);
  const focusCardRef = useRef<HTMLElement>(null);
  const journeyTriggerRef = useRef<ScrollTrigger | null>(null);
  const stepScrollRef = useRef<gsap.core.Tween | null>(null);
  const journeyStateRef = useRef<JourneyState>({
    intro: 0,
    focus: 0,
    focusedItemId: null,
    switchFromItemId: null,
    focusSwitch: 0,
    handoff: 0,
    story: 0,
  });
  const openItemRef = useRef<(itemId: string | null, opener: HTMLElement | null) => void>(() => undefined);
  const [storyStepIndex, setStoryStepIndex] = useState<number | null>(null);
  const loadJourney = useCallback<SceneLoader<LandingJourneyScene>>(
    (host) =>
      import("../scenes/landingJourneyScene").then(({ createLandingJourneyScene }) =>
        createLandingJourneyScene(host, journeyStateRef.current, (itemId) => openItemRef.current(itemId, null)),
      ),
    [],
  );
  const journeyScene = useLazyScene(journeyHostRef, loadJourney);
  const heroFocus = useHeroFileFocus(journeyStateRef, journeyScene, focusCardRef);
  const focusedFile = SYNCED_FILES.find((syncedFile) => syncedFile.id === heroFocus.focusedItemId);
  const { hash } = useLocation();

  const scrollToStep = useCallback((stepIndex: number, onInterrupted: (() => void) | null) => {
    const journeyTrigger = journeyTriggerRef.current;
    if (!journeyTrigger) return;
    stepScrollRef.current?.kill();
    stepScrollRef.current = gsap.to(window, {
      scrollTo: {
        y: journeyTrigger.labelToScroll(SYNC_STEP_LABELS[stepIndex]),
        autoKill: true,
        onAutoKill: onInterrupted ?? undefined,
      },
      duration: prefersReducedMotion() ? 0 : 1.4,
      ease: "power2.inOut",
    });
  }, []);
  const storyAutoplay = useStoryAutoplay(storyStepIndex, scrollToStep);

  useEffect(() => {
    openItemRef.current = heroFocus.openItem;
  }, [heroFocus.openItem]);

  useEffect(() => {
    const journey = journeyRef.current;
    const journeyStage = journeyStageRef.current;
    if (!journey || !journeyStage) return;
    const journeyState = journeyStateRef.current;
    let pinActive = false;
    const syncStoryStep = () => {
      setStoryStepIndex(pinActive && journeyState.handoff >= 0.999 ? stepIndexAtStory(journeyState.story) : null);
    };
    const journeyContext = gsap.context(() => {
      const handoffEnd = JOURNEY_SEGMENTS.hero + JOURNEY_SEGMENTS.handoff;
      const journeyTimeline = gsap.timeline({
        defaults: { ease: "none" },
        onUpdate: syncStoryStep,
        scrollTrigger: {
          trigger: journey,
          start: "top top",
          end: () => `+=${window.innerHeight * JOURNEY_LENGTH}`,
          pin: journeyStage,
          scrub: 0.8,
          invalidateOnRefresh: true,
          onToggle: (journeyTrigger) => {
            pinActive = journeyTrigger.isActive;
            syncStoryStep();
          },
        },
      });
      journeyTimeline
        .to(".hero-copy", { autoAlpha: 0, y: -40, duration: 0.5 }, JOURNEY_SEGMENTS.hero)
        .to(".hero-file-list", { autoAlpha: 0, duration: 0.3 }, JOURNEY_SEGMENTS.hero)
        .to(journeyState, { handoff: 1, duration: JOURNEY_SEGMENTS.handoff }, JOURNEY_SEGMENTS.hero)
        .fromTo(".sync-story", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, handoffEnd - 0.4)
        .addLabel(SYNC_STEP_LABELS[0], handoffEnd)
        .to(journeyState, { story: 1, duration: JOURNEY_SEGMENTS.step }, handoffEnd)
        .addLabel(SYNC_STEP_LABELS[1])
        .to(journeyState, { story: 2, duration: JOURNEY_SEGMENTS.step })
        .addLabel(SYNC_STEP_LABELS[2])
        .to(journeyState, { story: 3, duration: JOURNEY_SEGMENTS.step })
        .addLabel(SYNC_STEP_LABELS[3])
        .to({}, { duration: JOURNEY_SEGMENTS.tail });
      journeyTriggerRef.current = journeyTimeline.scrollTrigger ?? null;
    }, journey);
    return () => {
      journeyTriggerRef.current = null;
      journeyContext.revert();
    };
  }, []);

  useEffect(() => {
    const landing = landingRef.current;
    if (!landing) return;
    const revealContext = gsap.context(() => {
      gsap.from(".hero-reveal", { y: 18, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.08, delay: 0.1 });
      gsap.from(".maker > *", {
        y: 20,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: ".maker", start: "top 80%" },
      });
    }, landing);
    return () => revealContext.revert();
  }, []);

  useEffect(() => {
    if (!journeyScene) return;
    const journeyState = journeyScene.state;
    if (prefersReducedMotion()) {
      journeyState.intro = 1;
      return;
    }
    const introTween = gsap.to(journeyState, { intro: 1, duration: 2.4, ease: "expo.out", delay: 0.15 });
    return () => {
      introTween.kill();
    };
  }, [journeyScene]);

  useEffect(() => {
    if (hash === STORY_HASH) {
      scrollToStep(0, null);
      return;
    }
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash, scrollToStep]);

  useEffect(
    () => () => {
      stepScrollRef.current?.kill();
    },
    [],
  );

  return (
    <div ref={landingRef} className="landing" data-page="landing">
      <Nav />
      <main>
        <section ref={journeyRef} className="journey" aria-labelledby="hero-title">
          <div ref={journeyStageRef} className="journey-stage">
            <div className="hero-backlight" aria-hidden="true" />
            <div ref={journeyHostRef} className="journey-canvas" aria-hidden="true" />
            <div className="hero-copy">
              <h1 id="hero-title" className="hero-title hero-reveal">
                Your Cursor setup, in orbit.
              </h1>
              <p className="hero-sub hero-reveal">Settings, rules, and skills follow you to every computer.</p>
              <div className="hero-actions hero-reveal">
                <a className="hero-action hero-action--primary" href={EXTENSION_LISTING_URL} target="_blank" rel="noreferrer">
                  Install
                </a>
                <Link className="hero-action hero-action--secondary" to="/sign-in">
                  Sign in
                </Link>
              </div>
            </div>
            <ul className="hero-file-list" aria-label="Files that sync">
              {SYNCED_FILES.map((syncedFile) => (
                <li key={syncedFile.id}>
                  <button
                    type="button"
                    className="hero-file-button mono"
                    onClick={(clickEvent) => heroFocus.openItem(syncedFile.id, clickEvent.currentTarget)}
                  >
                    {syncedFile.label}
                  </button>
                </li>
              ))}
            </ul>
            {focusedFile ? (
              <FileFocusCard
                cardRef={focusCardRef}
                syncedFile={focusedFile}
                centered={!journeyScene}
                onClose={heroFocus.closeItem}
                onStep={heroFocus.stepItem}
              />
            ) : null}
            <HowItSyncsSection
              activeStepIndex={storyStepIndex ?? 0}
              onStepSelect={storyAutoplay.selectStep}
              autoplayStatus={storyAutoplay.status}
              onAutoplayToggle={storyAutoplay.toggle}
            />
          </div>
        </section>

        <WhatElseSection />

        <section className="maker" aria-labelledby="maker-name">
          <div className="maker-avatar" aria-hidden="true">
            MB
          </div>
          <h2 id="maker-name" className="maker-name">
            Marcelo Barella
          </h2>
          <p className="mono maker-role">A young SpaceXAI Ambassador.</p>
          <p className="maker-bio">
            He builds Cursor Sync so a setup can travel without handing the keys to the server. Everything is
            client-side encrypted before bytes leave your device.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
