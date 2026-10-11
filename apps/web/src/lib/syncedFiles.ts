export type SyncedFileKind = "file" | "folder";

export type SyncedFile = {
  id: string;
  label: string;
  kind: SyncedFileKind;
  whatItIs: string;
  howItHelps: string;
};

export const SYNCED_FILES: readonly SyncedFile[] = [
  {
    id: "settings",
    label: "settings.json",
    kind: "file",
    whatItIs: "Your editor preferences: theme, font, tab size.",
    howItHelps: "Every computer looks and feels the same.",
  },
  {
    id: "keybindings",
    label: "keybindings.json",
    kind: "file",
    whatItIs: "Your keyboard shortcuts.",
    howItHelps: "Your hands do not relearn anything.",
  },
  {
    id: "rules",
    label: "rules/",
    kind: "folder",
    whatItIs: "Instructions that tell the AI how you like to work.",
    howItHelps: "The AI follows your style on every computer.",
  },
  {
    id: "skills",
    label: "skills/",
    kind: "folder",
    whatItIs: "Step-by-step playbooks the AI agent can use.",
    howItHelps: "Your agent knows the same tricks everywhere.",
  },
  {
    id: "mcp",
    label: "mcp.json",
    kind: "file",
    whatItIs: "The list of outside tools your AI can use.",
    howItHelps: "You set them up once; every computer has them.",
  },
  {
    id: "extensions",
    label: "extensions",
    kind: "file",
    whatItIs: "The list of extensions you have installed.",
    howItHelps: "A new computer gets the same add-ons.",
  },
  {
    id: "snippets",
    label: "snippets/",
    kind: "folder",
    whatItIs: "Short code templates you type often.",
    howItHelps: "Your shortcuts for common code come with you.",
  },
  {
    id: "agents",
    label: "AGENTS.md",
    kind: "file",
    whatItIs: "Project notes the AI reads before it starts.",
    howItHelps: "The AI gets the same briefing on every computer.",
  },
  {
    id: "hooks",
    label: "hooks.json",
    kind: "file",
    whatItIs: "Small automatic actions around the AI's work.",
    howItHelps: "Your safety checks run everywhere.",
  },
  {
    id: "commands",
    label: "commands/",
    kind: "folder",
    whatItIs: "Your custom slash commands.",
    howItHelps: "Your own commands work on every computer.",
  },
];
