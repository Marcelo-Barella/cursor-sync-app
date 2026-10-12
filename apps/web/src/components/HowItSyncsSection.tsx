import { SYNC_STEPS } from "../lib/syncStoryTimeline";
import type { AutoplayStatus } from "../lib/syncStoryTimeline";
import "./HowItSyncsSection.css";

type HowItSyncsSectionProps = {
  activeStepIndex: number;
  onStepSelect: (stepIndex: number) => void;
  autoplayStatus: AutoplayStatus;
  onAutoplayToggle: () => void;
};

export function HowItSyncsSection({ activeStepIndex, onStepSelect, autoplayStatus, onAutoplayToggle }: HowItSyncsSectionProps) {
  return (
    <section className="sync-story" id="how-it-syncs" aria-labelledby="sync-story-title">
      <h2 id="sync-story-title" className="sync-story-title">
        How it syncs
      </h2>
      <ol className="sync-story-steps">
        {SYNC_STEPS.map((syncStep, stepIndex) => (
          <li
            key={syncStep.number}
            className={stepIndex === activeStepIndex ? "sync-story-step is-active" : "sync-story-step"}
          >
            <button
              type="button"
              className="sync-story-step-button"
              aria-current={stepIndex === activeStepIndex ? "step" : undefined}
              onClick={() => onStepSelect(stepIndex)}
            >
              <span className="sync-story-step-head">
                <span className="mono sync-story-step-number">{syncStep.number}</span>
                <span className="sync-story-step-title">{syncStep.title}</span>
              </span>
              <span className="sync-story-step-detail">{syncStep.detail}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="sync-story-footer">
        <div className="sync-story-controls">
          <div className="sync-story-rail" aria-hidden="true">
            {SYNC_STEPS.map((syncStep, stepIndex) => (
              <span
                key={syncStep.number}
                className={stepIndex <= activeStepIndex ? "sync-story-tick is-lit" : "sync-story-tick"}
              />
            ))}
          </div>
          <button type="button" className="mono sync-story-play" data-autoplay-control="" onClick={onAutoplayToggle}>
            {autoplayStatus === "playing" ? "Pause" : "Play"}
          </button>
        </div>
        <p className="sync-story-note">Nothing moves. Everything is copied. Only your passphrase opens the copies.</p>
      </div>
    </section>
  );
}
