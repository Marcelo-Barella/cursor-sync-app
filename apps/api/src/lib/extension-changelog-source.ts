export const EXTENSION_CHANGELOG_URL =
  "https://raw.githubusercontent.com/Marcelo-Barella/cursor-sync/main/CHANGELOG.md";

const FETCH_TIMEOUT_MS = 5_000;

export async function fetchExtensionChangelogMarkdown(): Promise<string> {
  const response = await fetch(EXTENSION_CHANGELOG_URL, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (response.status !== 200) {
    throw new Error(`changelog_http_${response.status}`);
  }
  return response.text();
}
