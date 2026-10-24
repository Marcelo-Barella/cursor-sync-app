export type LaunchNoteNode =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "bold"; children: LaunchNoteNode[] };

export function formatLaunchNote(note: string): LaunchNoteNode[] {
  return readLaunchNote(note, 0, note.length, true);
}

function readLaunchNote(note: string, start: number, end: number, allowBold: boolean): LaunchNoteNode[] {
  const nodes: LaunchNoteNode[] = [];
  let plain = "";
  let cursor = start;

  const flushPlain = () => {
    if (plain.length === 0) return;
    nodes.push({ kind: "text", text: plain });
    plain = "";
  };

  while (cursor < end) {
    const marked = readMarkedSpan(note, cursor, end, allowBold);
    if (marked === null) {
      plain += note[cursor];
      cursor += 1;
      continue;
    }
    flushPlain();
    nodes.push(marked.node);
    cursor = marked.cursor;
  }

  flushPlain();
  return nodes;
}

function readMarkedSpan(
  note: string,
  cursor: number,
  end: number,
  allowBold: boolean,
): { node: LaunchNoteNode; cursor: number } | null {
  if (note[cursor] === "`") return readCodeSpan(note, cursor, end);
  if (!allowBold || note[cursor] !== "*") return null;
  const token = note.startsWith("**", cursor) ? "**" : "*";
  return readBoldSpan(note, cursor, end, token);
}

function readCodeSpan(note: string, cursor: number, end: number): { node: LaunchNoteNode; cursor: number } | null {
  const close = note.indexOf("`", cursor + 1);
  if (close === -1 || close >= end) return null;
  const text = note.slice(cursor + 1, close);
  if (text.length === 0) return null;
  return { node: { kind: "code", text }, cursor: close + 1 };
}

function readBoldSpan(
  note: string,
  cursor: number,
  end: number,
  token: "**" | "*",
): { node: LaunchNoteNode; cursor: number } | null {
  const close = findMarkerClose(note, cursor + token.length, end, token);
  if (close === null) return null;
  const children = readLaunchNote(note, cursor + token.length, close, false);
  if (children.length === 0) return null;
  return { node: { kind: "bold", children }, cursor: close + token.length };
}

function findMarkerClose(note: string, from: number, end: number, token: "**" | "*"): number | null {
  let cursor = from;
  while (cursor < end) {
    if (note[cursor] === "`") {
      const codeClose = note.indexOf("`", cursor + 1);
      if (codeClose === -1 || codeClose >= end) return null;
      cursor = codeClose + 1;
      continue;
    }
    if (token === "**" && note.startsWith("**", cursor)) return cursor;
    if (token === "*" && note[cursor] === "*" && !note.startsWith("**", cursor)) return cursor;
    cursor += token === "*" && note.startsWith("**", cursor) ? 2 : 1;
  }
  return null;
}
