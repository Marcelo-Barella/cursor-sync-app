import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Nav } from "../components/Nav";
import { SiteFooter } from "../components/SiteFooter";
import type { RocketFlight, RocketLaunchScene } from "../scenes/rocketLaunchScene";
import { useLazyScene, type SceneLoader } from "../scenes/useLazyScene";
import { rocketPositionForVersion } from "../lib/changelogReleases";
import { useExtensionChangelog } from "../lib/useExtensionChangelog";
import "./ChangelogPage.css";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const MISSION_GROUND = -1;
const GROUND_ROW_ID = "launch-ground";
const FARTHEST_ROW_ID = "launch-farthest";

type LaunchReadout = { version: string; phaseLabel: string };

const GROUND_READOUT: LaunchReadout = { version: "0.0.0", phaseLabel: "Empty pad" };

function launchFocusRatio(): number {
  return window.matchMedia("(max-width: 900px)").matches ? 0.72 : 0.5;
}

function scrollRowToFocus(rowId: string, durationSeconds: number): gsap.core.Tween | null {
  const row = document.getElementById(rowId);
  if (!row) return null;
  return gsap.to(window, {
    duration: durationSeconds,
    ease: "power1.inOut",
    scrollTo: { y: row, offsetY: window.innerHeight * launchFocusRatio() - row.offsetHeight / 2, autoKill: true },
  });
}

export function ChangelogPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const rocketHostRef = useRef<HTMLDivElement>(null);
  const flightRef = useRef<RocketFlight>({ mission: MISSION_GROUND });
  const targetMissionRef = useRef(MISSION_GROUND);
  const introTweenRef = useRef<gsap.core.Tween | null>(null);
  const introScrollYRef = useRef(0);
  const scrollTweenRef = useRef<gsap.core.Tween | null>(null);
  const [readout, setReadout] = useState<LaunchReadout>(GROUND_READOUT);
  const changelogLoad = useExtensionChangelog();
  const releases = changelogLoad.status === "ready" ? changelogLoad.changelog.releases : [];
  const releaseMissions = releases.map((release) => rocketPositionForVersion(release.version).mission);

  const loadRocket = useCallback<SceneLoader<RocketLaunchScene>>(
    (host) =>
      import("../scenes/rocketLaunchScene").then(({ createRocketLaunchScene }) =>
        createRocketLaunchScene(host, flightRef.current),
      ),
    [],
  );
  const rocketScene = useLazyScene(rocketHostRef, loadRocket);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const headingContext = gsap.context(() => {
      gsap.from(".launch-heading > *", { y: 20, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.08 });
    }, page);
    return () => {
      headingContext.revert();
      scrollTweenRef.current?.kill();
    };
  }, []);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const flight = flightRef.current;
    targetMissionRef.current = Number(page.querySelector<HTMLElement>(".launch-row")?.dataset.mission ?? MISSION_GROUND);
    let followMission: ((mission: number) => void) | null = null;
    const steerRocket = (mission: number) => {
      targetMissionRef.current = mission;
      const introPlaying = introTweenRef.current?.isActive() ?? false;
      if (introPlaying && Math.abs(window.scrollY - introScrollYRef.current) < 8) return;
      introTweenRef.current?.kill();
      introTweenRef.current = null;
      followMission?.(mission);
    };
    const launchContext = gsap.context(() => {
      followMission = gsap.quickTo(flight, "mission", { duration: 0.9, ease: "power2.out" });
      gsap.utils.toArray<HTMLElement>(".launch-row").forEach((row) => {
        const rowMission = Number(row.dataset.mission);
        const nextMission = Number(row.dataset.nextMission);
        const rowReadout: LaunchReadout = {
          version: row.dataset.version ?? GROUND_READOUT.version,
          phaseLabel: row.dataset.phase ?? GROUND_READOUT.phaseLabel,
        };
        ScrollTrigger.create({
          trigger: row,
          start: () => `top ${launchFocusRatio() * 100}%`,
          end: () => `bottom ${launchFocusRatio() * 100}%`,
          invalidateOnRefresh: true,
          toggleClass: "is-active",
          onToggle: (rowTrigger) => {
            if (rowTrigger.isActive) setReadout(rowReadout);
          },
          onUpdate: (rowTrigger) => {
            steerRocket(gsap.utils.interpolate(rowMission, nextMission, rowTrigger.progress));
          },
        });
      });
    }, page);
    return () => {
      launchContext.revert();
    };
  }, [changelogLoad]);

  useEffect(() => {
    if (!rocketScene || changelogLoad.status !== "ready") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      flightRef.current.mission = targetMissionRef.current;
      return;
    }
    introScrollYRef.current = window.scrollY;
    introTweenRef.current = gsap.fromTo(
      flightRef.current,
      { mission: MISSION_GROUND },
      { mission: () => targetMissionRef.current, duration: 7, ease: "power1.inOut", delay: 0.3 },
    );
    return () => {
      introTweenRef.current?.kill();
    };
  }, [rocketScene, changelogLoad]);

  const flyToGround = () => {
    scrollTweenRef.current?.kill();
    scrollTweenRef.current = scrollRowToFocus(GROUND_ROW_ID, 1.6);
  };

  const launchFromGround = () => {
    scrollTweenRef.current?.kill();
    scrollTweenRef.current = scrollRowToFocus(FARTHEST_ROW_ID, 9);
  };

  return (
    <div ref={pageRef} className="launch-page" data-page="changelog">
      <Nav />
      <main className="launch">
        <header className="launch-heading">
          <h1 className="launch-title">The launch.</h1>
          <p className="launch-lead">
            Each release builds the rocket. Before 1.0.0 it is still being built. At 0.8.0 it lifts. At 0.9.0 it
            enters orbit. After 1.0.0 it is stable and only goes farther.
          </p>
          <button type="button" className="launch-cue mono" onClick={flyToGround}>
            <span>Trajectory timeline</span>
            <span className="launch-cue-rule" aria-hidden="true" />
            <span className="launch-cue-action">↑ Read from the ground up</span>
          </button>
        </header>

        <div className="launch-grid">
          <div className="launch-viewport">
            <div ref={rocketHostRef} className="launch-canvas" aria-hidden="true" />
            <p className="launch-readout mono" aria-live="polite">
              <span className="launch-readout-version">v{readout.version}</span>
              <span>{readout.phaseLabel}</span>
            </p>
          </div>

          <ol className="launch-timeline" aria-label="Releases, newest first">
            {releases.map((release, releaseIndex) => {
              const position = rocketPositionForVersion(release.version);
              return (
                <li
                  key={release.version}
                  id={releaseIndex === 0 ? FARTHEST_ROW_ID : undefined}
                  className={`launch-row launch-row--${position.phase}`}
                  data-mission={position.mission}
                  data-next-mission={releaseMissions[releaseIndex + 1] ?? MISSION_GROUND}
                  data-version={release.version}
                  data-phase={position.phaseLabel}
                >
                  <span className="launch-node" aria-hidden="true" />
                  <div className="launch-entry">
                    <span className="launch-version mono">{release.version}</span>
                    <p className="launch-meta mono">{position.phaseLabel}</p>
                    {release.sections.map((section) => (
                      <section key={section.heading} className="launch-notes">
                        <h2 className="launch-notes-heading mono">{section.heading}</h2>
                        <ul className="launch-notes-items">
                          {section.items.map((item, itemIndex) => (
                            <li key={itemIndex}>{item}</li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                </li>
              );
            })}
            {changelogLoad.status === "failed" ? (
              <li className="launch-notice mono" role="status">
                Release notes are unavailable right now.
              </li>
            ) : null}
            <li
              id={GROUND_ROW_ID}
              className="launch-row launch-row--ground"
              data-mission={MISSION_GROUND}
              data-next-mission={MISSION_GROUND}
              data-version={GROUND_READOUT.version}
              data-phase={GROUND_READOUT.phaseLabel}
            >
              <span className="launch-node" aria-hidden="true" />
              <div className="launch-entry">
                <p className="launch-meta mono">Ground pad 39A · Grounded, still being assembled</p>
                <button type="button" className="launch-go" onClick={launchFromGround}>
                  Launch from the ground up
                </button>
              </div>
            </li>
          </ol>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
