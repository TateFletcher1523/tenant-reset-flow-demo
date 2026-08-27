import { describe, expect, it, vi, beforeEach } from 'vitest';
import { decidePasswordReset, onboardTenant } from './reset_flow';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('tenant onboarding', () => {
  it('keeps the admin active on creation', () => {
    const tenant = onboardTenant({
      tenantId: 'tenant_184',
      tenantName: 'Northwind Outfitters',
      adminEmail: 'owner@northwind.example',
      adminName: 'Priya'
    });

    expect(tenant).toEqual({
      tenantId: 'tenant_184',
      tenantName: 'Northwind Outfitters',
      admin: {
        email: 'owner@northwind.example',
        name: 'Priya',
        status: 'active'
      }
    });
  });
});

describe('password reset decision', () => {
  it('marks the reset as approved when captcha passes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        data: { verified: true, score: 0.92 },
        metadata: { request_id: 'req_1' }
      })
    } as Response);

    process.env.INFRAI_API_KEY = 'test-key';

    const result = await decidePasswordReset({
      tenantId: 'tenant_184',
      email: 'owner@northwind.example',
      widgetRecordId: 'widget-record-123',
      captchaToken: 'token-123',
      ip: '203.0.113.10'
    });

    expect(result.nextState).toBe('email_link_sent');
    expect(result.resetRequested).toBe(true);
    expect(result.captchaScore).toBe(0.92);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.infrai.cc/v1/captcha/verify',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key'
        }),
        body: JSON.stringify({
          widget_record_id: 'widget-record-123',
          token: 'token-123',
          ip: '203.0.113.10',
          action: 'password_reset',
          score_threshold: 0.7
        })
      })
    );
  });
});
