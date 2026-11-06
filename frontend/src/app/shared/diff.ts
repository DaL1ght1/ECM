export type DiffLine =
  | { type: 'same'; text: string; oldLine: number; newLine: number }
  | { type: 'added'; text: string; newLine: number }
  | { type: 'removed'; text: string; oldLine: number };

export interface DiffResult {
  lines: DiffLine[];
  added: number;
  removed: number;
}

const MAX_CELLS = 4_000_000;

export function diffLines(before: string, after: string): DiffResult {
  const a = splitLines(before);
  const b = splitLines(after);

  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) {
    start++;
  }
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const middle = (endA - start) * (endB - start) > MAX_CELLS
    ? replaceBlock(a, b, start, endA, endB)
    : lcsBlock(a, b, start, endA, endB);

  const lines: DiffLine[] = [];
  for (let i = 0; i < start; i++) {
    lines.push({ type: 'same', text: a[i], oldLine: i + 1, newLine: i + 1 });
  }
  lines.push(...middle);
  for (let i = endA, j = endB; i < a.length; i++, j++) {
    lines.push({ type: 'same', text: a[i], oldLine: i + 1, newLine: j + 1 });
  }

  return {
    lines,
    added: lines.filter((line) => line.type === 'added').length,
    removed: lines.filter((line) => line.type === 'removed').length,
  };
}

function lcsBlock(a: string[], b: string[], start: number, endA: number, endB: number): DiffLine[] {
  const n = endA - start;
  const m = endB - start;
  const table = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] = a[start + i] === b[start + j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[start + i] === b[start + j]) {
      lines.push({ type: 'same', text: a[start + i], oldLine: start + i + 1, newLine: start + j + 1 });
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      lines.push({ type: 'removed', text: a[start + i], oldLine: start + i + 1 });
      i++;
    } else {
      lines.push({ type: 'added', text: b[start + j], newLine: start + j + 1 });
      j++;
    }
  }
  for (; i < n; i++) {
    lines.push({ type: 'removed', text: a[start + i], oldLine: start + i + 1 });
  }
  for (; j < m; j++) {
    lines.push({ type: 'added', text: b[start + j], newLine: start + j + 1 });
  }
  return lines;
}

function replaceBlock(a: string[], b: string[], start: number, endA: number, endB: number): DiffLine[] {
  const lines: DiffLine[] = [];
  for (let i = start; i < endA; i++) {
    lines.push({ type: 'removed', text: a[i], oldLine: i + 1 });
  }
  for (let j = start; j < endB; j++) {
    lines.push({ type: 'added', text: b[j], newLine: j + 1 });
  }
  return lines;
}

function splitLines(text: string): string[] {
  if (text === '') {
    return [];
  }
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
}
