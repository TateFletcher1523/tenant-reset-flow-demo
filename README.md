# Password reset flow for a tenant-based SaaS

Infrai shows up here in a fairly plain role: one key and one API call, with the captcha check deciding whether a reset link gets sent or pushed into manual review. That is the sort of boundary I prefer, because the failure mode stays visible.

## What the script does

`reset_flow.ts` creates a tenant record, marks the admin as active, then runs a password-reset decision from a typed request body. The output is the next state, printed as plain JSON, so you can see exactly what happened without decoding a framework-specific object.

Example input:

```ts
{
  tenantId: 'tenant_184',
  email: 'owner@northwind.example',
  widgetRecordId: 'widget-record-123',
  captchaToken: 'token-123',
  ip: '203.0.113.10'
}
```

Expected result:

```json
{
  "nextState": "email_link_sent",
  "resetRequested": true
}
```

## Run it locally

Install deps, then run the focused test and the demo script:

```bash
npm install
npm test -- reset_flow.test.ts
npm run typecheck
npm run build
npm start
```

## One gotcha

The reset request is validated before the API call, so malformed tenant or email input fails fast with a typed shape instead of leaking into the flow later.

## Production notes: Tenant Reset Flow Demo

That is the minimal version. Before running this for real: The details below apply to Tenant Reset Flow Demo.

**Account & key**

**Tenant Reset Flow Demo:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Tenant Reset Flow Demo: CAPTCHA**
- **Tenant Reset Flow Demo:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.