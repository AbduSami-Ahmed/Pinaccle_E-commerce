# ADR-0007 — Authentication and Identity Provider Strategy

**Status**: Accepted  
**Date**: 2026-11-03  
**Deciders**: Engineering Lead, Business Owner (pending confirmation)

---

## Context

Pinnacle requires secure user authentication for both customers and staff.  
The technology stack targets AWS managed services for production. We need to decide:

1. Which identity provider (IdP) to use in production.
2. How to support local development without a live cloud IdP.
3. How the NestJS backend validates tokens regardless of provider.

---

## Decision

### Production Target: AWS Cognito

AWS Cognito User Pools is the designated production IdP.

**Rationale:**

- Fully managed — no password-hash storage, no custom session infrastructure.
- Native AWS integration with IAM, ALB, and other services already in the stack.
- Supports OIDC/OAuth2 flows (Authorization Code + PKCE for SPA, Hosted UI for admin).
- Provides JWT tokens (ID token + Access token) signed with RS256; public keys served via JWKS endpoint.
- Handles MFA, account recovery, email verification, and user lifecycle out of the box.
- Reduces compliance surface: password hashing, rate limiting on auth endpoints, brute-force protection are delegated.

**Why not Auth0:** Third-party vendor lock-in outside the AWS ecosystem; Cognito provides equivalent features at lower cost at Pinnacle's expected scale.  
**Why not self-hosted Keycloak:** Operational overhead contradicts the managed-services preference. Revisit if Cognito pricing becomes a concern.  
**Why not custom JWT only:** Rolling custom credential storage in production is a known anti-pattern and increases audit burden.

### Local Development Mode: Self-Issued HS256 JWT

Because Cognito credentials require an AWS account and cannot be embedded in source control, local development uses a self-issued HS256 JWT signed with a configurable `JWT_SECRET` environment variable.

**Critical constraint:** The local dev mode **must never be deployed to production.**  
Enforcement mechanism: the backend reads `AUTH_PROVIDER` from environment:

- `AUTH_PROVIDER=local` → HS256 strategy, accepts email+password login via `/auth/login`.
- `AUTH_PROVIDER=cognito` → RS256 strategy, validates against Cognito JWKS endpoint; the `/auth/login` endpoint is disabled.

The JWT strategy interface is identical in both modes. Swapping requires only environment variable changes, not code changes.

---

## Token and Session Architecture

### Token Format (local dev)

```
Header:  { "alg": "HS256", "typ": "JWT" }
Payload: {
  "sub":         "<userId (UUID)>",
  "email":       "user@example.com",
  "isStaff":     false,
  "permissions": ["catalog:product:view", ...],
  "customerId":  "<UUID or undefined>",
  "iat":         <unix timestamp>,
  "exp":         <unix timestamp + 7 days>
}
```

### Token Format (Cognito production)

Cognito issues a separate **ID token** and **Access token**.  
The backend validates the **Access token** (which carries custom attributes including `custom:permissions` or resolves permissions from the User Pool Group mapping).  
Cognito JWKS URL: `https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json`

### Frontend Session Handling

- Token stored **exclusively** in an `httpOnly` cookie named `access_token`.
- **Never stored in `localStorage` or `sessionStorage`** — XSS cannot steal an httpOnly cookie.
- Cookie attributes:
  - `httpOnly: true` — inaccessible to JavaScript.
  - `secure: true` in production — only sent over HTTPS.
  - `sameSite: 'strict'` in production, `'lax'` in local dev.
  - `maxAge: 7 days` (aligns with token expiry).
  - `path: '/'`.
- **CSRF considerations:** SameSite=Strict in production provides strong CSRF protection for same-origin flows. For third-party integrations (e.g., webhooks), add a `X-CSRF-Token` double-submit cookie if needed in a future phase.
- **Logout:** `POST /auth/logout` clears the cookie server-side (`res.clearCookie('access_token')`). The frontend must redirect to the login page after logout.
- **Token refresh:** Local dev issues a 7-day token. Cognito provides Refresh Tokens via the Hosted UI flow — token refresh via `/auth/refresh` will be added when Cognito is integrated.

---

## Required AWS Cognito Setup (not yet completed)

The following steps must be performed by a developer with AWS console access before deploying to production:

1. **Create a Cognito User Pool**
   - Sign-in: Email (required, unique)
   - Required attributes: `email`, `given_name`, `family_name`
   - Custom attributes: `custom:role` (String), `custom:isStaff` (Boolean)
   - Password policy: min 12 chars, require uppercase + lowercase + digits + symbols
   - MFA: Optional (recommend mandatory for staff accounts)
   - Email verification: Enabled (Cognito sends confirmation code)

2. **Create an App Client**
   - For Next.js server-side (confidential client): generate a client secret, store in AWS Secrets Manager.
   - Allowed OAuth flows: Authorization Code
   - Allowed OAuth scopes: `openid`, `email`, `profile`
   - Callback URL: `https://pinnacle.example.com/auth/callback`
   - Logout URL: `https://pinnacle.example.com`

3. **Configure the Cognito Domain**
   - Use a custom domain if possible (e.g., `auth.pinnacle.example.com`).
   - Otherwise use the Cognito-hosted domain: `https://{prefix}.auth.{region}.amazoncognito.com`

4. **Set environment variables in production**

   ```
   AUTH_PROVIDER=cognito
   COGNITO_USER_POOL_ID=ap-southeast-2_XXXXXXXXX
   COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
   COGNITO_CLIENT_SECRET=<from Secrets Manager>
   COGNITO_REGION=ap-southeast-2
   COGNITO_JWKS_URL=https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_XXXXXXXXX/.well-known/jwks.json
   ```

5. **Initial staff users**
   - Create the Super Admin user via Cognito console or admin SDK; assign `custom:role=SUPER_ADMIN`.
   - Customer self-registration goes through the Hosted UI or custom sign-up form calling Cognito API.

---

## Guard Interface (provider-agnostic)

The `JwtStrategy` in NestJS extracts a payload conforming to:

```typescript
interface JwtPayload {
  sub: string; // userId
  email: string;
  isStaff: boolean;
  permissions: string[]; // PermissionCode[]
  customerId?: string;
}
```

In `AUTH_PROVIDER=local` mode the strategy uses `passportJwt.Strategy` with `secretOrKey: process.env.JWT_SECRET`.  
In `AUTH_PROVIDER=cognito` mode the strategy uses `passportJwt.Strategy` with `secretOrKeyProvider` pointing at the JWKS endpoint (using `jwks-rsa`).  
**The PermissionsGuard, CustomerOwnershipGuard, and all business modules are identical in both modes.**

---

## Consequences

- ✅ No credentials are stored in source control.
- ✅ Swapping to Cognito requires only environment variable changes.
- ✅ The httpOnly cookie approach eliminates XSS-based token theft.
- ✅ SameSite=Strict provides CSRF protection for production.
- ⚠️ Cognito setup must be completed before production deployment.
- ⚠️ Token refresh for local dev is not implemented (7-day expiry is acceptable for dev).
- ⚠️ Cognito pricing scales with Monthly Active Users — review at >50 k MAU.
- 🔲 **Client decision required**: Confirm AWS region preference (default assumed: `ap-southeast-2`).
- 🔲 **Client decision required**: Confirm whether staff use the same Cognito User Pool or a separate one.
