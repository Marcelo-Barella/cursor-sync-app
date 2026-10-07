import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { useExtensionChangelog } from "../lib/useExtensionChangelog";
import type { PlanetOrbitScene } from "../scenes/planetOrbitScene";
import { useLazyScene, type SceneLoader } from "../scenes/useLazyScene";
import { Mark } from "./Mark";
import "./AuthLayout.css";

const SIGN_IN_ORBIT_FILES = ["settings.json", "rules", "skills"] as const;

const loadSignInOrbit: SceneLoader<PlanetOrbitScene> = (host) =>
  import("../scenes/planetOrbitScene").then(({ createPlanetOrbitScene }) =>
    createPlanetOrbitScene(host, {
      theme: "obsidian",
      fileNames: SIGN_IN_ORBIT_FILES,
      story: { arrival: 0, reveal: 0, key: 0, seal: 0, transit: 0 },
    }),
  );

type AuthLayoutProps = {
  children: ReactNode;
  page: "sign-in" | "sign-up" | "continue" | "callback" | "verify";
  showMarkInCard?: boolean;
};

export function AuthLayout({ children, page, showMarkInCard = false }: AuthLayoutProps) {
  const orbitRef = useRef<HTMLDivElement>(null);
  const signInOrbit = useLazyScene(orbitRef, loadSignInOrbit);
  const changelogLoad = useExtensionChangelog();
  const latestVersion = changelogLoad.status === "ready" ? changelogLoad.changelog.latest : null;

  useEffect(() => {
    if (!signInOrbit) return;
    const story = signInOrbit.story;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      Object.assign(story, { arrival: 1, reveal: 1, seal: 1 });
      return;
    }
    const orbitIntro = gsap
      .timeline()
      .to(story, { arrival: 1, duration: 2, ease: "expo.out" }, 0)
      .to(story, { reveal: 1, duration: 1.4, ease: "power2.out" }, 0.4)
      .to(story, { seal: 1, duration: 1.2, ease: "power1.inOut" }, 1.6);
    return () => {
      orbitIntro.kill();
    };
  }, [signInOrbit]);

  return (
    <div className="auth-page" data-page={page}>
      <header className="auth-header">
        <div className="auth-header-start">
          <Link to="/" className="auth-header-brand" aria-label="Cursor Sync home">
            <span className="auth-header-dot" aria-hidden="true" />
            <span>Cursor Sync</span>
          </Link>
          {latestVersion ? <span className="auth-header-version mono">v{latestVersion}</span> : null}
        </div>
        <Link to="/" className="auth-header-back">
          Back
        </Link>
      </header>
      <main className="auth-main">
        <div className="auth-visual" aria-hidden="true">
          <div className="auth-visual-ring" />
          <div ref={orbitRef} className="auth-orbit" />
          <div className="auth-terminal mono">
            <div className="auth-terminal-lights">
              <i />
              <i />
              <i />
            </div>
            <p>$ cursor-sync status</p>
            <p>
              files: <b>sealed</b>
            </p>
            <p>cipher: AES-256-GCM, on device</p>
            <p>server sees: ciphertext only</p>
          </div>
        </div>
        <div className="auth-card">
          {showMarkInCard ? (
            <div className="auth-card-mark">
              <Mark size="md" />
            </div>
          ) : null}
          {children}
        </div>
      </main>
      <footer className="auth-footer mono">
        <span>© Cursor Sync. Zero-Knowledge Cryptographic Storage Engine.</span>
        <span className="auth-footer-detail">
          <i aria-hidden="true" /> Encrypted on device
        </span>
      </footer>
    </div>
  );
}
