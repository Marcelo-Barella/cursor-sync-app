import { useEffect, useRef, type RefObject } from "react";
import type { SyncedFile } from "../lib/syncedFiles";

type FileFocusCardProps = {
  cardRef: RefObject<HTMLElement | null>;
  syncedFile: SyncedFile;
  centered: boolean;
  onClose: () => void;
  onStep: (direction: 1 | -1) => void;
};

export function FileFocusCard({ cardRef, syncedFile, centered, onClose, onStep }: FileFocusCardProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section
      ref={cardRef}
      className={centered ? "file-focus-card is-centered" : "file-focus-card"}
      aria-labelledby="file-focus-title"
    >
      <div className="file-focus-head">
        <span className="mono file-focus-kind">{syncedFile.kind}</span>
        <button ref={closeButtonRef} type="button" className="file-focus-button" onClick={onClose}>
          Close
        </button>
      </div>
      <h2 id="file-focus-title" className="mono file-focus-title">
        {syncedFile.label}
      </h2>
      <dl className="file-focus-facts">
        <div>
          <dt>What it is</dt>
          <dd>{syncedFile.whatItIs}</dd>
        </div>
        <div>
          <dt>How it helps you</dt>
          <dd>{syncedFile.howItHelps}</dd>
        </div>
      </dl>
      <div className="file-focus-steps">
        <button type="button" className="file-focus-button" onClick={() => onStep(-1)}>
          Previous
        </button>
        <button type="button" className="file-focus-button" onClick={() => onStep(1)}>
          Next
        </button>
      </div>
    </section>
  );
}
