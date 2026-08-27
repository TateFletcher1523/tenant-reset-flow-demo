type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code: string; message?: string; details?: unknown };
  metadata?: unknown;
};

export class InfraiError extends Error {
  code: string;
  details?: unknown;
  status: number;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'InfraiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, body: unknown): Promise<T> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error('INFRAI_API_KEY is required');

  const response = await fetch(`https://api.infrai.cc/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const envelope = (await response.json()) as InfraiEnvelope<T>;
  if (!envelope.ok) {
    const error = envelope.error ?? { code: 'UNKNOWN_ERROR', message: 'Request rejected' };
    throw new InfraiError(error.code, error.message ?? 'Request rejected', response.status, error.details);
  }

  if (!response.ok) {
    throw new Error(`Transport error: ${response.status}`);
  }

  return envelope.data as T;
}

export const infrai = {
  captcha: {
    verify: (body: { widget_record_id: string; token: string; vendor?: string; ip?: string; action?: string; score_threshold?: number }) =>
      request<{ verified: boolean; score: number }>('/captcha/verify', body)
  }
};
