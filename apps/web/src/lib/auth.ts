import { AuthenticatedUser } from '@pinnacle/contracts';

/**
 * Frontend Session Architecture:
 *
 * 1. Storage:
 *    Tokens are stored EXCLUSIVELY in httpOnly, SameSite=Lax (dev) / SameSite=Strict (prod)
 *    cookies set by the NestJS API (/api/v1/auth/login).
 *    NO tokens are ever stored in browser localStorage or sessionStorage to protect
 *    against Cross-Site Scripting (XSS) credential exfiltration.
 *
 * 2. Session Validation:
 *    The frontend checks authentication state by querying the `/api/v1/auth/me` endpoint.
 *    Because credentials (cookies) are passed with `credentials: 'include'`, the browser
 *    attaches the `access_token` cookie automatically.
 *
 * 3. Logout:
 *    Calling `logoutUser()` triggers `POST /api/v1/auth/logout`, which clears the
 *    `access_token` cookie on the server response via Set-Cookie headers.
 *
 * 4. Authorization Enforcement:
 *    UI components may conditionally hide elements based on permissions or roles,
 *    but all authorization is strictly enforced by the backend API guards
 *    (JwtAuthGuard, PermissionsGuard, CustomerOwnershipGuard).
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export async function fetchCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return null;
    }

    const json = (await res.json()) as { user: AuthenticatedUser };
    return json.user;
  } catch {
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } finally {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }
}
