import { useCallback, useState } from "react";
import "./ChatContinuityStage.css";
import "./WhatElseSection.css";

const CONTINUITY_STEPS = [
  {
    label: "Export",
    position: "0%",
    description: "Snapshot your active chat context into a secure, transportable state package.",
    originState: "packaging: ready",
    destState: "listening: idle",
    destActive: false,
  },
  {
    label: "Save",
    position: "33%",
    description: "Store local zero-knowledge session fragments directly to your hardware keychain.",
    originState: "keychain: encrypted",
    destState: "listening: idle",
    destActive: false,
  },
  {
    label: "Import",
    position: "66%",
    description: "Drag your encrypted session payload into Cursor to hydrate the full agent reasoning tree.",
    originState: "streamed: ok",
    destState: "payload: decrypting",
    destActive: true,
  },
  {
    label: "Resume",
    position: "100%",
    description: "Continue generation seamlessly with full file buffers and previous thought scratchpads intact.",
    originState: "detached",
    destState: "state: restored",
    destActive: true,
  },
] as const;

const DEFAULT_STEP_INDEX = 2;

function LaptopGlyph() {
  return (
    <svg className="continuity-glyph-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 19h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function DesktopGlyph() {
  return (
    <svg className="continuity-glyph-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 20h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 15v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function WhatElseSection() {
  const [activeStepIndex, setActiveStepIndex] = useState(DEFAULT_STEP_INDEX);
  const [detailFading, setDetailFading] = useState(false);
  const activeStep = CONTINUITY_STEPS[activeStepIndex] ?? CONTINUITY_STEPS[DEFAULT_STEP_INDEX];

  const activateStep = useCallback(
    (index: number) => {
      if (index === activeStepIndex) {
        return;
      }
      setDetailFading(true);
      window.setTimeout(() => {
        setActiveStepIndex(index);
        setDetailFading(false);
      }, 150);
    },
    [activeStepIndex],
  );

  return (
    <section className="what-else" id="what-else" aria-labelledby="what-else-title">
      <header className="what-else-header">
        <div className="what-else-eyebrow">
          <span className="what-else-eyebrow-ping" aria-hidden="true" />
          <span className="mono what-else-eyebrow-label">Chat Continuity</span>
        </div>
        <h2 id="what-else-title" className="what-else-title">What else it can do</h2>
        <p className="what-else-lead">
          Move live agent sessions between machines without losing context or reasoning traces.
        </p>
      </header>

      <div className="continuity-motion-wrap">
        <div className="continuity-motion-canvas laser-grid">
          <div className="continuity-motion-vignette" aria-hidden="true" />
          <div className="continuity-glyph continuity-glyph--origin">
            <div className="continuity-glyph-card">
              <div className="continuity-glyph-card-head">
                <div className="continuity-glyph-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <span className="mono continuity-glyph-tag">ORIGIN</span>
              </div>
              <div className="continuity-glyph-card-body">
                <LaptopGlyph />
                <span className="mono continuity-glyph-device">MacBook Pro</span>
              </div>
              <div className="continuity-glyph-card-foot">
                <span className="continuity-glyph-status-dot continuity-glyph-status-dot--live" aria-hidden="true" />
                <span className="mono continuity-glyph-state">{activeStep.originState}</span>
              </div>
            </div>
          </div>

          <div className="continuity-transit" aria-hidden="true">
            <div className="continuity-transit-track" />
            <div className="continuity-transit-trail transition-smooth" style={{ width: activeStep.position }} />
            <div
              className="continuity-transit-packet transition-smooth"
              style={{ left: activeStep.position }}
            >
              <div className="continuity-transit-streak" />
              <div className="continuity-packet-core packet-halo animate-packet-pulse">
                <div className="continuity-packet-nucleus" />
              </div>
            </div>
          </div>

          <div className="continuity-glyph continuity-glyph--destination">
            <div className="continuity-glyph-card">
              <div className="continuity-glyph-card-head continuity-glyph-card-head--dest">
                <span className="mono continuity-glyph-tag">DESTINATION</span>
                <div className="continuity-glyph-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className="continuity-glyph-card-body continuity-glyph-card-body--dest">
                <span className="mono continuity-glyph-device">Workstation</span>
                <DesktopGlyph />
              </div>
              <div className="continuity-glyph-card-foot continuity-glyph-card-foot--dest">
                <span className="mono continuity-glyph-state">{activeStep.destState}</span>
                <span
                  className={
                    activeStep.destActive
                      ? "continuity-glyph-status-dot continuity-glyph-status-dot--live"
                      : "continuity-glyph-status-dot"
                  }
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <nav className="what-else-rail" aria-label="Continuity steps">
        {CONTINUITY_STEPS.map((step, stepIndex) => (
          <span key={step.label} className="what-else-rail-item">
            {stepIndex > 0 ? <span className="what-else-rail-separator" aria-hidden="true">•</span> : null}
            <button
              type="button"
              className={
                stepIndex === activeStepIndex
                  ? "what-else-rail-button is-active"
                  : "what-else-rail-button"
              }
              onClick={() => activateStep(stepIndex)}
              onMouseEnter={() => activateStep(stepIndex)}
            >
              <span>{step.label}</span>
              <span className="what-else-rail-indicator" aria-hidden="true" />
            </button>
          </span>
        ))}
      </nav>

      <div className="what-else-detail-wrap">
        <p className={`what-else-detail${detailFading ? " is-fading" : ""}`} aria-live="polite">
          {activeStep.description}
        </p>
      </div>
    </section>
  );
}
