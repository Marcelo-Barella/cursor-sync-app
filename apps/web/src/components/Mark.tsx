import "./Mark.css";

type MarkProps = {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
};

export function Mark({ size = "md", showWordmark = false }: MarkProps) {
  return (
    <div className={`mark mark--${size}`}>
      <img src="/mark.png" alt="" className="mark-image" width={120} height={94} />
      {showWordmark ? (
        <div className="mark-wordmark">
          <span className="mark-name">Cursor Sync</span>
          <span className="mark-tagline">Sync all your cursor files</span>
        </div>
      ) : null}
    </div>
  );
}
