import { describe, expect, test } from 'bun:test';
import {
  applyPatches,
  type PatchOp,
  PatchOpSchema,
  type PatchRejectionReason,
  renderNumberedSource,
  resolvePatchedCode,
  summarizeOps,
} from './patch.js';
import { validateAndTransformCode } from './validate.js';

const PROGRAM = ['const a = 1', 'const b = 2', 'const c = 3', 'a + b'].join(
  '\n',
);

/** Unwraps a patch expected to succeed, failing loudly if it did not. */
function patched(previous: string, ops: PatchOp[]): string {
  const result = applyPatches(previous, ops);
  if (result.error !== undefined) {
    throw new Error(`expected success, got: ${result.error}`);
  }
  return result.code;
}

describe('applyPatches — single op', () => {
  const cases: Array<{ name: string; op: PatchOp; expected: string[] }> = [
    {
      name: 'replace one line',
      op: { op: 'replace', lines: [2, 2], value: 'const b = 20' },
      expected: ['const a = 1', 'const b = 20', 'const c = 3', 'a + b'],
    },
    {
      name: 'replace a range with fewer lines',
      op: { op: 'replace', lines: [1, 3], value: 'const a = 6' },
      expected: ['const a = 6', 'a + b'],
    },
    {
      name: 'replace a range with more lines',
      op: { op: 'replace', lines: [2, 2], value: 'const b = 2\nconst d = 4' },
      expected: [
        'const a = 1',
        'const b = 2',
        'const d = 4',
        'const c = 3',
        'a + b',
      ],
    },
    {
      name: 'replace the first line',
      op: { op: 'replace', lines: [1, 1], value: 'const a = 9' },
      expected: ['const a = 9', 'const b = 2', 'const c = 3', 'a + b'],
    },
    {
      name: 'replace the last line',
      op: { op: 'replace', lines: [4, 4], value: 'a * b' },
      expected: ['const a = 1', 'const b = 2', 'const c = 3', 'a * b'],
    },
    {
      name: 'replace the whole program',
      op: { op: 'replace', lines: [1, 4], value: '42' },
      expected: ['42'],
    },
    {
      name: 'delete one line',
      op: { op: 'delete', lines: [3, 3] },
      expected: ['const a = 1', 'const b = 2', 'a + b'],
    },
    {
      name: 'delete a range',
      op: { op: 'delete', lines: [2, 3] },
      expected: ['const a = 1', 'a + b'],
    },
    {
      name: 'delete the first line',
      op: { op: 'delete', lines: [1, 1] },
      expected: ['const b = 2', 'const c = 3', 'a + b'],
    },
    {
      name: 'delete the last line',
      op: { op: 'delete', lines: [4, 4] },
      expected: ['const a = 1', 'const b = 2', 'const c = 3'],
    },
    {
      name: 'insert before a line',
      op: { op: 'insert', lines: [2, 2], value: 'const z = 0' },
      expected: [
        'const a = 1',
        'const z = 0',
        'const b = 2',
        'const c = 3',
        'a + b',
      ],
    },
    {
      name: 'insert before the first line',
      op: { op: 'insert', lines: [1, 1], value: '// header' },
      expected: [
        '// header',
        'const a = 1',
        'const b = 2',
        'const c = 3',
        'a + b',
      ],
    },
    {
      name: 'insert at lastLine + 1 appends',
      op: { op: 'insert', lines: [5, 5], value: '// trailer' },
      expected: [
        'const a = 1',
        'const b = 2',
        'const c = 3',
        'a + b',
        '// trailer',
      ],
    },
    {
      name: 'insert multiple lines',
      op: { op: 'insert', lines: [4, 4], value: 'const d = 4\nconst e = 5' },
      expected: [
        'const a = 1',
        'const b = 2',
        'const c = 3',
        'const d = 4',
        'const e = 5',
        'a + b',
      ],
    },
    {
      name: 'insert ignores the second line number',
      op: { op: 'insert', lines: [2, 99], value: 'const z = 0' },
      expected: [
        'const a = 1',
        'const z = 0',
        'const b = 2',
        'const c = 3',
        'a + b',
      ],
    },
  ];

  for (const { name, op, expected } of cases) {
    test(name, () => {
      expect(patched(PROGRAM, [op])).toBe(expected.join('\n'));
    });
  }
});

describe('applyPatches — multiple ops', () => {
  test('non-overlapping ops all apply against the original', () => {
    const result = patched(PROGRAM, [
      { op: 'replace', lines: [1, 1], value: 'const a = 10' },
      { op: 'replace', lines: [3, 3], value: 'const c = 30' },
    ]);
    expect(result).toBe(
      ['const a = 10', 'const b = 2', 'const c = 30', 'a + b'].join('\n'),
    );
  });

  test('mixed op kinds in one call', () => {
    const result = patched(PROGRAM, [
      { op: 'insert', lines: [1, 1], value: '// top' },
      { op: 'delete', lines: [2, 2] },
      { op: 'replace', lines: [4, 4], value: 'a * c' },
    ]);
    expect(result).toBe(
      ['// top', 'const a = 1', 'const c = 3', 'a * c'].join('\n'),
    );
  });

  test('later ops do not see earlier ops effects', () => {
    // If ops saw each other, the delete of line 3 would land on the wrong line
    // once line 1 expanded into two.
    const result = patched(PROGRAM, [
      { op: 'replace', lines: [1, 1], value: 'const a = 1\nconst a2 = 1' },
      { op: 'delete', lines: [3, 3] },
    ]);
    expect(result).toBe(
      ['const a = 1', 'const a2 = 1', 'const b = 2', 'a + b'].join('\n'),
    );
  });

  test('op order in the array does not matter', () => {
    const ascending = patched(PROGRAM, [
      { op: 'replace', lines: [1, 1], value: 'A' },
      { op: 'replace', lines: [3, 3], value: 'C' },
    ]);
    const descending = patched(PROGRAM, [
      { op: 'replace', lines: [3, 3], value: 'C' },
      { op: 'replace', lines: [1, 1], value: 'A' },
    ]);
    expect(ascending).toBe(descending);
  });

  test('insert at the start of a replace lands before the replacement', () => {
    const result = patched(PROGRAM, [
      { op: 'replace', lines: [2, 3], value: 'const bc = 5' },
      { op: 'insert', lines: [2, 2], value: '// note' },
    ]);
    expect(result).toBe(
      ['const a = 1', '// note', 'const bc = 5', 'a + b'].join('\n'),
    );
  });

  test('insert at the start of a delete lands where the delete was', () => {
    const result = patched(PROGRAM, [
      { op: 'delete', lines: [2, 3] },
      { op: 'insert', lines: [2, 2], value: '// gone' },
    ]);
    expect(result).toBe(['const a = 1', '// gone', 'a + b'].join('\n'));
  });

  test('insert just after a replace lands after the replacement', () => {
    const result = patched(PROGRAM, [
      { op: 'replace', lines: [2, 3], value: 'const bc = 5' },
      { op: 'insert', lines: [4, 4], value: '// note' },
    ]);
    expect(result).toBe(
      ['const a = 1', 'const bc = 5', '// note', 'a + b'].join('\n'),
    );
  });

  test('inserts sharing an anchor keep the order they were written in', () => {
    const result = patched(PROGRAM, [
      { op: 'insert', lines: [2, 2], value: '// first' },
      { op: 'insert', lines: [2, 2], value: '// second' },
    ]);
    expect(result).toBe(
      [
        'const a = 1',
        '// first',
        '// second',
        'const b = 2',
        'const c = 3',
        'a + b',
      ].join('\n'),
    );
  });
});

describe('applyPatches — rejections', () => {
  const cases: Array<{
    name: string;
    ops: PatchOp[];
    reason: PatchRejectionReason;
    errorContains?: string[];
  }> = [
    {
      name: 'no ops',
      ops: [],
      reason: 'empty-ops',
    },
    {
      name: 'overlapping replace ranges',
      ops: [
        { op: 'replace', lines: [1, 3], value: 'x' },
        { op: 'replace', lines: [3, 4], value: 'y' },
      ],
      reason: 'overlapping-ranges',
      errorContains: ['ops[0] (replace 1-3)', 'ops[1] (replace 3-4)'],
    },
    {
      name: 'a replace fully containing a delete',
      ops: [
        { op: 'replace', lines: [1, 4], value: 'x' },
        { op: 'delete', lines: [2, 2] },
      ],
      reason: 'overlapping-ranges',
      errorContains: ['ops[0] (replace 1-4)', 'ops[1] (delete 2)'],
    },
    {
      name: 'identical ranges',
      ops: [
        { op: 'replace', lines: [2, 2], value: 'x' },
        { op: 'replace', lines: [2, 2], value: 'y' },
      ],
      reason: 'overlapping-ranges',
    },
    {
      name: 'insert anchored inside a replaced range',
      ops: [
        { op: 'replace', lines: [1, 3], value: 'x' },
        { op: 'insert', lines: [2, 2], value: 'y' },
      ],
      reason: 'insert-inside-range',
      errorContains: ['ops[1] (insert before 2)', 'ops[0] (replace 1-3)'],
    },
    {
      name: 'end line past the end of the program',
      ops: [{ op: 'replace', lines: [3, 9], value: 'x' }],
      reason: 'out-of-range',
      errorContains: ['4 line(s)'],
    },
    {
      name: 'start line past the end of the program',
      ops: [{ op: 'delete', lines: [7, 8] }],
      reason: 'out-of-range',
    },
    {
      name: 'insert anchored past lastLine + 1',
      ops: [{ op: 'insert', lines: [6, 6], value: 'x' }],
      reason: 'out-of-range',
      errorContains: ['use 5 to append'],
    },
    {
      name: 'line number below 1',
      ops: [{ op: 'replace', lines: [0, 2], value: 'x' }],
      reason: 'out-of-range',
    },
    {
      name: 'inverted range',
      ops: [{ op: 'replace', lines: [3, 2], value: 'x' }],
      reason: 'inverted-range',
    },
    {
      name: 'replace without a value',
      ops: [{ op: 'replace', lines: [1, 1] }],
      reason: 'missing-value',
      errorContains: ['ops[0] (replace 1)'],
    },
    {
      name: 'insert without a value',
      ops: [{ op: 'insert', lines: [1, 1] }],
      reason: 'missing-value',
    },
    {
      name: 'delete carrying a value',
      ops: [{ op: 'delete', lines: [1, 1], value: 'x' }],
      reason: 'unexpected-value',
      errorContains: ['replace'],
    },
  ];

  for (const { name, ops, reason, errorContains } of cases) {
    test(name, () => {
      const result = applyPatches(PROGRAM, ops);
      expect(result.reason).toBe(reason);
      expect(result.code).toBeUndefined();
      for (const fragment of errorContains ?? []) {
        expect(result.error).toContain(fragment);
      }
    });
  }

  test('nothing is applied when one op in a batch is invalid', () => {
    const result = applyPatches(PROGRAM, [
      { op: 'replace', lines: [1, 1], value: 'ok' },
      { op: 'replace', lines: [9, 9], value: 'bad' },
    ]);
    expect(result.code).toBeUndefined();
    expect(result.error).toBeDefined();
  });
});

describe('applyPatches — edge cases', () => {
  test('a single-line program can be replaced', () => {
    expect(patched('42', [{ op: 'replace', lines: [1, 1], value: '43' }])).toBe(
      '43',
    );
  });

  test('deleting every line yields an empty program', () => {
    expect(patched(PROGRAM, [{ op: 'delete', lines: [1, 4] }])).toBe('');
  });

  test('an empty previous program has zero lines, so insert at 1 appends', () => {
    expect(patched('', [{ op: 'insert', lines: [1, 1], value: 'const a = 1' }])).toBe(
      'const a = 1',
    );
  });

  test('an empty previous program has no line 1 to replace', () => {
    const result = applyPatches('', [
      { op: 'replace', lines: [1, 1], value: 'x' },
    ]);
    expect(result.reason).toBe('out-of-range');
  });

  test('blank lines are counted', () => {
    const withBlank = 'const a = 1\n\nconst b = 2';
    expect(patched(withBlank, [{ op: 'delete', lines: [2, 2] }])).toBe(
      'const a = 1\nconst b = 2',
    );
  });
});

describe('applyPatches — output still goes through validation', () => {
  test('a patch producing valid code validates', () => {
    const result = patched(PROGRAM, [
      { op: 'replace', lines: [2, 2], value: 'const b = 20' },
    ]);
    expect(validateAndTransformCode(result).valid).toBe(true);
  });

  test('a patch producing a syntax error is reported as a syntax error', () => {
    const result = patched(PROGRAM, [
      { op: 'replace', lines: [2, 2], value: 'const b = {' },
    ]);
    const validation = validateAndTransformCode(result);
    expect(validation.valid).toBe(false);
    expect(validation.error).toBeDefined();
  });
});

describe('resolvePatchedCode', () => {
  const ops: PatchOp[] = [{ op: 'replace', lines: [1, 1], value: 'const a = 2' }];
  const failedRun = { code: PROGRAM, failed: true, startedToolCalls: 0 };

  test('rejects a patch with no previous program', () => {
    const result = resolvePatchedCode(null, ops);
    expect(result.reason).toBe('no-previous-program');
    expect(result.error).toContain('complete program');
  });

  test('rejects a patch after a successful run', () => {
    const result = resolvePatchedCode({ ...failedRun, failed: false }, ops);
    expect(result.reason).toBe('previous-run-succeeded');
    expect(result.error).toContain('second time');
  });

  test('rejects a patch when the failed run had already committed', () => {
    const result = resolvePatchedCode({ ...failedRun, startedToolCalls: 3 }, ops);
    expect(result.reason).toBe('previous-run-started-calls');
    expect(result.error).toContain('started 3 tool call(s)');
    expect(result.error).toContain('work that remains');
  });

  test('applies a patch after a failed run that committed nothing', () => {
    const result = resolvePatchedCode(failedRun, ops);
    expect(result.error).toBeUndefined();
    expect(result.code).toContain('const a = 2');
  });

  test('an empty previous program is still patchable', () => {
    const result = resolvePatchedCode(
      { code: '', failed: true, startedToolCalls: 0 },
      [{ op: 'insert', lines: [1, 1], value: 'x' }],
    );
    expect(result.code).toBe('x');
  });
});

describe('summarizeOps', () => {
  test('counts covered and written lines separately', () => {
    expect(
      summarizeOps([
        { op: 'replace', lines: [1, 3], value: 'a\nb' },
        { op: 'delete', lines: [5, 6] },
        { op: 'insert', lines: [8, 8], value: 'c' },
      ]),
    ).toEqual({ opCount: 3, linesCovered: 5, linesWritten: 3 });
  });

  test('an empty op list summarizes to zeros', () => {
    expect(summarizeOps([])).toEqual({
      opCount: 0,
      linesCovered: 0,
      linesWritten: 0,
    });
  });

  test('an inverted range contributes zero, never a negative count', () => {
    // Summaries are taken before validation, so they must survive junk ops.
    expect(summarizeOps([{ op: 'replace', lines: [9, 2], value: 'x' }])).toEqual(
      { opCount: 1, linesCovered: 0, linesWritten: 1 },
    );
  });

  test('a batch mixing a valid and an inverted range stays non-negative', () => {
    expect(
      summarizeOps([
        { op: 'delete', lines: [1, 2] },
        { op: 'delete', lines: [8, 3] },
      ]),
    ).toEqual({ opCount: 2, linesCovered: 2, linesWritten: 0 });
  });
});

describe('renderNumberedSource', () => {
  test('prefixes 1-based line numbers', () => {
    expect(renderNumberedSource(PROGRAM)).toBe(
      [
        '1 | const a = 1',
        '2 | const b = 2',
        '3 | const c = 3',
        '4 | a + b',
      ].join('\n'),
    );
  });

  test('right-aligns numbers past nine', () => {
    const lines = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`);
    const rendered = renderNumberedSource(lines.join('\n')).split('\n');
    expect(rendered[0]).toBe(' 1 | line 1');
    expect(rendered[9]).toBe('10 | line 10');
  });

  test('preserves blank lines', () => {
    expect(renderNumberedSource('a\n\nb')).toBe('1 | a\n2 | \n3 | b');
  });

  test('an empty program renders as nothing', () => {
    expect(renderNumberedSource('')).toBe('');
  });

  test('numbers match the anchors applyPatches resolves', () => {
    const rendered = renderNumberedSource(PROGRAM).split('\n');
    const target = 3;
    expect(rendered[target - 1]).toContain('const c = 3');
    expect(patched(PROGRAM, [{ op: 'delete', lines: [target, target] }])).not.toContain(
      'const c = 3',
    );
  });
});

describe('PatchOpSchema', () => {
  test('accepts a well-formed replace', () => {
    const parsed = PatchOpSchema.safeParse({
      op: 'replace',
      lines: [1, 2],
      value: 'x',
    });
    expect(parsed.success).toBe(true);
  });

  test('accepts a delete without a value', () => {
    expect(
      PatchOpSchema.safeParse({ op: 'delete', lines: [1, 2] }).success,
    ).toBe(true);
  });

  test('rejects a replace without a value', () => {
    const parsed = PatchOpSchema.safeParse({ op: 'replace', lines: [1, 2] });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toContain('`value` is required');
  });

  test('rejects an unknown op', () => {
    expect(
      PatchOpSchema.safeParse({ op: 'move', lines: [1, 2], value: 'x' }).success,
    ).toBe(false);
  });

  test('rejects non-integer and sub-1 line numbers', () => {
    expect(
      PatchOpSchema.safeParse({ op: 'delete', lines: [1.5, 2] }).success,
    ).toBe(false);
    expect(PatchOpSchema.safeParse({ op: 'delete', lines: [0, 2] }).success).toBe(
      false,
    );
  });

  test('rejects a one-element range', () => {
    expect(PatchOpSchema.safeParse({ op: 'delete', lines: [1] }).success).toBe(
      false,
    );
  });
});
