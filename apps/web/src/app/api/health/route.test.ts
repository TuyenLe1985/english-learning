import { describe, it, expect } from 'vitest';
import { GET } from './route';

describe('Health route', () => {
  it('returns status ok', async () => {
    const response = await GET();
    const json = await response.json();

    expect(json.status).toBe('ok');
    expect(typeof json.timestamp).toBe('string');
  });

  it('returns a valid ISO timestamp', async () => {
    const response = await GET();
    const json = await response.json();

    const timestamp = new Date(json.timestamp);
    expect(timestamp.getTime()).not.toBeNaN();
  });
});
