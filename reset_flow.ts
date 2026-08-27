import { z } from 'zod';
import { infrai, InfraiError } from './infrai_client';

const onboardingSchema = z.object({
  tenantId: z.string().min(1),
  tenantName: z.string().min(1),
  adminEmail: z.string().email(),
  adminName: z.string().min(1)
});

const resetRequestSchema = z.object({
  tenantId: z.string().min(1),
  email: z.string().email(),
  widgetRecordId: z.string().min(1),
  captchaToken: z.string().min(1),
  ip: z.string().min(1).optional()
});

const resetDecisionSchema = z.object({
  tenantId: z.string(),
  email: z.string().email(),
  widgetRecordId: z.string().min(1),
  captchaToken: z.string().min(1),
  ip: z.string().optional()
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type PasswordResetInput = z.infer<typeof resetRequestSchema>;

export function onboardTenant(input: OnboardingInput) {
  const parsed = onboardingSchema.parse(input);
  return {
    tenantId: parsed.tenantId,
    tenantName: parsed.tenantName,
    admin: {
      email: parsed.adminEmail,
      name: parsed.adminName,
      status: 'active' as const
    }
  };
}

export async function decidePasswordReset(input: PasswordResetInput) {
  const parsed = resetDecisionSchema.parse(input);
  const captcha = await infrai.captcha.verify({
    widget_record_id: parsed.widgetRecordId,
    token: parsed.captchaToken,
    ip: parsed.ip,
    action: 'password_reset',
    score_threshold: 0.7
  });

  const approved = captcha.verified && captcha.score >= 0.7;

  return {
    tenantId: parsed.tenantId,
    email: parsed.email,
    captchaScore: captcha.score,
    resetRequested: approved,
    nextState: approved ? 'email_link_sent' : 'manual_review'
  } as const;
}

async function main() {
  const onboarded = onboardTenant({
    tenantId: 'tenant_184',
    tenantName: 'Northwind Outfitters',
    adminEmail: 'owner@northwind.example',
    adminName: 'Priya'
  });

  console.log(JSON.stringify({ stage: 'onboarded', onboarded }, null, 2));

  try {
    const result = await decidePasswordReset({
      tenantId: onboarded.tenantId,
      email: onboarded.admin.email,
      widgetRecordId: process.env.WIDGET_RECORD_ID ?? 'demo-widget-record-id',
      captchaToken: process.env.CAPTCHA_TOKEN ?? 'demo-token',
      ip: process.env.CLIENT_IP
    });
    console.log(JSON.stringify({ stage: 'reset_decision', result }, null, 2));
  } catch (error) {
    if (error instanceof InfraiError) {
      console.log(JSON.stringify({ stage: 'reset_decision', error: { code: error.code, message: error.message } }, null, 2));
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}

if (require.main === module) {
  main();
}
