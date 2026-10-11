import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { useExtensionChangelog } from "../lib/useExtensionChangelog";
import type { AuthOrbitScene } from "../scenes/authOrbitScene";
import { useLazyScene, type SceneLoader } from "../scenes/useLazyScene";
import { Mark } from "./Mark";
import "./AuthLayout.css";

gsap.registerPlugin(Flip);

const loadAuthOrbit: SceneLoader<AuthOrbitScene> = (host) =>
  import("../scenes/authOrbitScene").then(({ createAuthOrbitScene }) =>
    createAuthOrbitScene(host, { intro: 0, expand: 0 }),
  );

type AuthLayoutProps = {
  children: ReactNode;
  page: "sign-in" | "sign-up" | "continue" | "callback" | "verify";
  showMarkInCard?: boolean;
  connectedPanel?: ReactNode;
};

type ConnectedLayout = "form" | "expanded" | "inline";

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AuthLayout({ children, page, showMarkInCard = false, connectedPanel }: AuthLayoutProps) {
  const orbitRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const connectedRef = useRef<HTMLDivElement>(null);
  const flipStateRef = useRef<ReturnType<typeof Flip.getState> | null>(null);
  const [connectedLayout, setConnectedLayout] = useState<ConnectedLayout>("form");
  const authOrbit = useLazyScene(orbitRef, loadAuthOrbit);
  const changelogLoad = useExtensionChangelog();
  const latestVersion = changelogLoad.status === "ready" ? changelogLoad.changelog.latest : null;

  useEffect(() => {
    if (!authOrbit) return;
    const orbitState = authOrbit.state;
    if (prefersReducedMotion()) {
      orbitState.intro = 1;
      return;
    }
    const orbitIntro = gsap.to(orbitState, { intro: 1, duration: 2, ease: "expo.out" });
    return () => {
      orbitIntro.kill();
    };
  }, [authOrbit]);

  useEffect(() => {
    if (!connectedPanel || connectedLayout !== "form") return;
    const visual = visualRef.current;
    const card = cardRef.current;
    if (!visual || !card || prefersReducedMotion() || orbitRef.current?.dataset.webgl === "off") {
      setConnectedLayout("inline");
      return;
    }
    const cardFade = gsap.to(card, {
      autoAlpha: 0,
      duration: 0.35,
      ease: "power2.in",
      onComplete: () => {
        flipStateRef.current = Flip.getState(visual);
        setConnectedLayout("expanded");
      },
    });
    return () => {
      cardFade.kill();
    };
  }, [connectedPanel, connectedLayout]);

  useLayoutEffect(() => {
    const flipState = flipStateRef.current;
    if (connectedLayout !== "expanded" || !flipState) return;
    flipStateRef.current = null;
    const visualFlip = Flip.from(flipState, { duration: 1.1, ease: "power3.inOut" });
    const panelReveal = gsap.fromTo(
      connectedRef.current,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.6, delay: 0.8, ease: "power2.out" },
    );
    return () => {
      visualFlip.progress(1).kill();
      panelReveal.progress(1).kill();
    };
  }, [connectedLayout]);

  useEffect(() => {
    if (connectedLayout !== "expanded" || !authOrbit) return;
    const expandTween = gsap.to(authOrbit.state, { expand: 1, duration: 1.4, ease: "none" });
    return () => {
      expandTween.kill();
    };
  }, [connectedLayout, authOrbit]);

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
      <main className={connectedLayout === "expanded" ? "auth-main is-connected" : "auth-main"}>
        <div ref={visualRef} className="auth-visual" aria-hidden="true">
          <div className="auth-visual-ring" />
          <div ref={orbitRef} className="auth-orbit" />
        </div>
        <div ref={cardRef} className="auth-card">
          {showMarkInCard ? (
            <div className="auth-card-mark">
              <Mark size="md" />
            </div>
          ) : null}
          {connectedLayout === "inline" ? connectedPanel : children}
        </div>
        {connectedLayout === "expanded" ? (
          <div ref={connectedRef} className="auth-connected">
            {connectedPanel}
          </div>
        ) : null}
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
