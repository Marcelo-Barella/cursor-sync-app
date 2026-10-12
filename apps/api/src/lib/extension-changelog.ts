export type ExtensionReleaseSection = { heading: string; items: string[] };

export type ExtensionRelease = { version: string; sections: ExtensionReleaseSection[] };

export type ExtensionChangelog = {
  fetchedAt: string;
  latest: string | null;
  releases: ExtensionRelease[];
};

type ReleaseEntry = { heading: string | null; text: string };

type ReleaseDraft = { version: string; grouped: boolean; entries: ReleaseEntry[] };

const ANY_RELEASE_HEADING = /^## /m;
const STABLE_RELEASE_HEADING = /^## (?:v?(\d+\.\d+\.\d+)(?=\s|$)|\[(\d+\.\d+\.\d+)\])/;
const SECTION_HEADING = /^###\s+(.+?)\s*$/;
const BULLET = /^\s*[-*] (.*)$/;
const FLAT_PREFIX = /^([a-z]+):/i;
const NOTES_HEADING = "Notes";

const FLAT_PREFIX_SECTIONS = new Map<string, string>([
  ["feat", "Added"],
  ["feature", "Added"],
  ["fix", "Fixed"],
  ["fixed", "Fixed"],
  ["change", "Changed"],
  ["changed", "Changed"],
  ["chore", "Changed"],
  ["docs", "Changed"],
  ["test", "Changed"],
  ["refactor", "Changed"],
  ["remove", "Removed"],
  ["removed", "Removed"],
]);

function flatSectionHeading(text: string): string {
  const prefix = FLAT_PREFIX.exec(text)?.[1];
  if (!prefix) return NOTES_HEADING;
  return FLAT_PREFIX_SECTIONS.get(prefix.toLowerCase()) ?? NOTES_HEADING;
}

function sectionsFromDraft(draft: ReleaseDraft): ExtensionReleaseSection[] {
  const itemsByHeading = new Map<string, string[]>();
  for (const entry of draft.entries) {
    const heading = draft.grouped ? (entry.heading ?? NOTES_HEADING) : flatSectionHeading(entry.text);
    const items = itemsByHeading.get(heading) ?? [];
    items.push(entry.text);
    itemsByHeading.set(heading, items);
  }
  return [...itemsByHeading].map(([heading, items]) => ({ heading, items }));
}

function compareVersionsDescending(left: string, right: string): number {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let partIndex = 0; partIndex < 3; partIndex += 1) {
    const difference = (rightParts[partIndex] ?? 0) - (leftParts[partIndex] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export function parseExtensionChangelog(markdown: string): ExtensionRelease[] | null {
  if (!ANY_RELEASE_HEADING.test(markdown)) return null;
  const drafts: ReleaseDraft[] = [];
  let draft: ReleaseDraft | null = null;
  let sectionHeading: string | null = null;
  let openEntry: ReleaseEntry | null = null;

  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith("## ")) {
      const headingMatch = STABLE_RELEASE_HEADING.exec(line);
      const version = headingMatch?.[1] ?? headingMatch?.[2];
      draft = version ? { version, grouped: false, entries: [] } : null;
      if (draft) drafts.push(draft);
      sectionHeading = null;
      openEntry = null;
      continue;
    }
    if (!draft) continue;
    const sectionMatch = SECTION_HEADING.exec(line);
    if (sectionMatch) {
      sectionHeading = sectionMatch[1];
      draft.grouped = true;
      openEntry = null;
      continue;
    }
    const trimmedLine = line.trim();
    if (trimmedLine === "") {
      openEntry = null;
      continue;
    }
    const bulletMatch = BULLET.exec(line);
    if (!bulletMatch && openEntry) {
      openEntry.text = `${openEntry.text} ${trimmedLine}`;
      continue;
    }
    openEntry = { heading: sectionHeading, text: bulletMatch ? bulletMatch[1].trim() : trimmedLine };
    draft.entries.push(openEntry);
  }

  return drafts
    .map((releaseDraft) => ({ version: releaseDraft.version, sections: sectionsFromDraft(releaseDraft) }))
    .sort((left, right) => compareVersionsDescending(left.version, right.version));
}
