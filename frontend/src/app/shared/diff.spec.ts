import { describe, expect, it } from 'vitest';
import { diffLines } from './diff';

describe('diffLines', () => {
  it('reports identical text as unchanged', () => {
    const result = diffLines('a\nb\nc\n', 'a\nb\nc\n');
    expect(result.added).toBe(0);
    expect(result.removed).toBe(0);
    expect(result.lines.every((line) => line.type === 'same')).toBe(true);
  });

  it('finds a changed line between common prefix and suffix', () => {
    const result = diffLines('title\nold body\nfooter', 'title\nnew body\nfooter');
    expect(result.lines.map((line) => line.type)).toEqual(['same', 'removed', 'added', 'same']);
    expect(result.added).toBe(1);
    expect(result.removed).toBe(1);
  });

  it('keeps line numbers for both sides', () => {
    const result = diffLines('one\nthree', 'one\ntwo\nthree');
    expect(result.lines).toEqual([
      { type: 'same', text: 'one', oldLine: 1, newLine: 1 },
      { type: 'added', text: 'two', newLine: 2 },
      { type: 'same', text: 'three', oldLine: 2, newLine: 3 },
    ]);
  });

  it('treats CRLF and LF as the same line breaks', () => {
    expect(diffLines('a\r\nb', 'a\nb').added).toBe(0);
  });

  it('handles empty documents', () => {
    expect(diffLines('', 'x\ny').added).toBe(2);
    expect(diffLines('x', '').removed).toBe(1);
  });
});
