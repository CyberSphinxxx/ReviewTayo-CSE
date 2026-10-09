import {
  API_CONTRACT_VERSION,
  HttpApiTransport,
  LocalOnlyTransport,
  createApiTransport,
  narrowAuthExchangeResult,
  narrowPushEventsResult,
} from '@/data/remote';

/**
 * Transport boundary.
 *
 * The contract tests are about the client's manners: nothing leaves the device
 * when no backend exists, a plaintext URL is never used, every HTTP outcome maps to
 * a retryable or permanent failure rather than an exception, and a response is
 * narrowed before it is trusted.
 */

interface FakeResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly body: string;
}

const response = (status: number, body = ''): FakeResponse => ({
  ok: status >= 200 && status < 300,
  status,
  body,
});

interface Call {
  readonly url: string;
  readonly init: RequestInit;
}

const fetchReplies = (
  replies: readonly (FakeResponse | Error)[],
): { readonly calls: Call[]; readonly fetchImpl: typeof fetch } => {
  const calls: Call[] = [];
  let index = 0;
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init: init ?? {} });
    const reply = replies[Math.min(index, replies.length - 1)];
    index += 1;
    if (reply instanceof Error) throw reply;
    if (reply === undefined) throw new Error('no reply');
    return {
      ok: reply.ok,
      status: reply.status,
      text: async () => reply.body,
    };
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
};

const abortError = (): Error => {
  const error = new Error('aborted');
  error.name = 'AbortError';
  return error;
};

describe('local-only transport', () => {
  it('reports itself unavailable and keeps events on the device', async () => {
    const transport = new LocalOnlyTransport();

    expect(transport.isRemote).toBe(false);
    expect(await transport.isAvailable()).toBe(false);

    const sent = await transport.send({ path: '/v1/sync/events', method: 'POST' });
    expect(sent.ok).toBe(false);
    if (sent.ok) return;
    expect(sent.error).toMatchObject({ code: 'network', retryable: true, status: null });
    expect(sent.error.message).toContain('No backend is configured');
  });

  it('is what a build without a base URL gets', async () => {
    const transport = createApiTransport({ apiBaseUrl: null });
    expect(transport).toBeInstanceOf(LocalOnlyTransport);
  });

  it('refuses a plaintext base URL rather than downgrading the transport', async () => {
    const transport = createApiTransport({ apiBaseUrl: 'http://api.example.com' });
    expect(transport).toBeInstanceOf(LocalOnlyTransport);
  });
});

describe('http transport', () => {
  it('posts json to the base URL with the idempotency key', async () => {
    const { calls, fetchImpl } = fetchReplies([response(200, JSON.stringify({ accepted: [] }))]);
    const transport = createApiTransport({ apiBaseUrl: 'https://api.example.com/' }, { fetchImpl });

    expect(transport.isRemote).toBe(true);
    expect(await transport.isAvailable()).toBe(true);

    const sent = await transport.send({
      path: '/v1/sync/events',
      method: 'POST',
      body: { contractVersion: API_CONTRACT_VERSION, data: { events: [] } },
      idempotencyKey: 'answer:a1',
    });

    expect(sent).toEqual({ ok: true, value: { accepted: [] } });
    expect(calls[0]?.url).toBe('https://api.example.com/v1/sync/events');
    expect(calls[0]?.init.method).toBe('POST');
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers['Idempotency-Key']).toBe('answer:a1');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('accepts an empty body', async () => {
    const { fetchImpl } = fetchReplies([response(204)]);
    const transport = new HttpApiTransport({ baseUrl: 'https://api.example.com', fetchImpl });
    expect(await transport.send({ path: '/v1/ping', method: 'GET' })).toEqual({
      ok: true,
      value: null,
    });
  });

  it('rejects a body it cannot parse', async () => {
    const { fetchImpl } = fetchReplies([response(200, '<html>nope</html>')]);
    const transport = new HttpApiTransport({ baseUrl: 'https://api.example.com', fetchImpl });

    const sent = await transport.send({ path: '/v1/sync/events', method: 'POST' });
    expect(sent.ok).toBe(false);
    if (sent.ok) return;
    expect(sent.error.code).toBe('unsupported');
    expect(sent.error.retryable).toBe(false);
  });

  it.each([
    [500, 'network', true],
    [503, 'network', true],
    [429, 'network', true],
    [401, 'unauthorized', false],
    [403, 'unauthorized', false],
    [409, 'conflict', false],
    [400, 'validation', false],
    [418, 'validation', false],
    [302, 'unknown', false],
  ])('maps status %i to %s (retryable: %s)', async (status, code, retryable) => {
    const { fetchImpl } = fetchReplies([response(status)]);
    const transport = new HttpApiTransport({ baseUrl: 'https://api.example.com', fetchImpl });

    const sent = await transport.send({ path: '/v1/sync/events', method: 'POST' });
    expect(sent.ok).toBe(false);
    if (sent.ok) return;
    expect(sent.error).toMatchObject({ status, code, retryable });
  });

  it('treats a failed connection as retryable, never as a thrown error', async () => {
    const { fetchImpl } = fetchReplies([new Error('socket closed')]);
    const transport = new HttpApiTransport({ baseUrl: 'https://api.example.com', fetchImpl });

    const sent = await transport.send({ path: '/v1/sync/events', method: 'POST' });
    expect(sent.ok).toBe(false);
    if (sent.ok) return;
    expect(sent.error).toMatchObject({ code: 'network', retryable: true, status: null });
    expect(sent.error.message).toBe('Could not reach the server.');
  });

  it('gives up on a slow server by aborting the request', async () => {
    const fetchImpl = ((_: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(abortError()));
      })) as unknown as typeof fetch;
    const transport = new HttpApiTransport({ baseUrl: 'https://api.example.com', fetchImpl });

    const sent = await transport.send({ path: '/v1/sync/events', method: 'POST', timeoutMs: 5 });
    expect(sent.ok).toBe(false);
    if (sent.ok) return;
    expect(sent.error.retryable).toBe(true);
    expect(sent.error.message).toBe('The server took too long to answer.');
  });

  it('sends auth headers when it has them, and logs in anyway when it does not', async () => {
    const { calls, fetchImpl } = fetchReplies([response(200, '{}'), response(200, '{}')]);

    const withAuth = new HttpApiTransport({
      baseUrl: 'https://api.example.com',
      fetchImpl,
      authorize: async () => ({ Authorization: 'Bearer token-1' }),
    });
    await withAuth.send({ path: '/v1/ping', method: 'GET' });
    expect((calls[0]?.init.headers as Record<string, string>).Authorization).toBe('Bearer token-1');

    const brokenAuth = new HttpApiTransport({
      baseUrl: 'https://api.example.com',
      fetchImpl,
      authorize: async () => {
        throw new Error('no token');
      },
    });
    expect(await brokenAuth.send({ path: '/v1/ping', method: 'GET' })).toEqual({
      ok: true,
      value: {},
    });
  });
});

describe('response narrowing', () => {
  const validPush = {
    accepted: ['event-1'],
    rejected: [{ id: 'event-2', reason: 'unknown question' }],
    serverTime: '2026-10-10T09:00:00.000Z',
  };

  it('accepts a well-formed sync response', () => {
    const narrowed = narrowPushEventsResult(validPush);
    expect(narrowed).toEqual({ ok: true, value: validPush });
  });

  it.each([
    ['a non-object', 'nope'],
    ['a missing server time', { accepted: [], rejected: [] }],
    ['a non-string accepted id', { accepted: [7], rejected: [], serverTime: 'now' }],
    ['a rejection without a reason', { accepted: [], rejected: [{ id: 'e1' }], serverTime: 'now' }],
  ])('rejects %s', (_label, value) => {
    const narrowed = narrowPushEventsResult(value);
    expect(narrowed.ok).toBe(false);
    if (narrowed.ok) return;
    expect(narrowed.error.code).toBe('unsupported');
  });

  it('accepts a well-formed auth response and defaults a missing name', () => {
    const narrowed = narrowAuthExchangeResult({
      userId: 'user-1',
      email: 'ada@example.com',
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: '2026-10-10T10:00:00.000Z',
    });

    expect(narrowed.ok).toBe(true);
    if (!narrowed.ok) return;
    expect(narrowed.value.displayName).toBe('ada');
  });

  it('rejects an auth response without tokens', () => {
    const narrowed = narrowAuthExchangeResult({ userId: 'user-1', email: 'ada@example.com' });
    expect(narrowed.ok).toBe(false);
  });
});
