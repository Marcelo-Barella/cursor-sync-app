import { useState } from "react";
import { Button } from "./Button";
import "./LoginCodePanel.css";

type LoginCodePanelProps = {
  code: string;
};

export function LoginCodePanel({ code }: LoginCodePanelProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="login-code-panel">
      <p className="login-code-label">Login code</p>
      <p className="login-code-value" data-testid="login-code-value">
        {code}
      </p>
      <p className="login-code-hint">
        Paste this into Cursor Sync under Enter login code if Return to Cursor
        does not open the app.
      </p>
      <Button type="button" variant="secondary" fullWidth onClick={() => void handleCopy()}>
        {copied ? "Copied" : "Copy code"}
      </Button>
    </div>
  );
}
