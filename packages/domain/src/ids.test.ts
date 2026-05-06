import { describe, expect, it } from 'vitest';

import {
  CanvasObjectIdSchema,
  ID_REGEX,
  randomCanvasObjectId,
  randomCuidLikeId,
} from './ids.js';

describe('randomCuidLikeId', () => {
  it('produces a value matching the canonical id regex', () => {
    for (let i = 0; i < 256; i++) {
      const id = randomCuidLikeId();
      expect(id).toMatch(ID_REGEX);
    }
  });

  it('produces ids in the [20, 32] character length window', () => {
    for (let i = 0; i < 64; i++) {
      const id = randomCuidLikeId();
      expect(id.length).toBeGreaterThanOrEqual(20);
      expect(id.length).toBeLessThanOrEqual(32);
    }
  });

  it('does not collide across many invocations', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1024; i++) seen.add(randomCuidLikeId());
    expect(seen.size).toBe(1024);
  });
});

describe('randomCanvasObjectId', () => {
  it('round-trips through CanvasObjectIdSchema without error', () => {
    for (let i = 0; i < 64; i++) {
      const id = randomCanvasObjectId();
      const parsed = CanvasObjectIdSchema.safeParse(id);
      expect(parsed.success).toBe(true);
    }
  });
});
