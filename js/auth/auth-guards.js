import { getSession } from './auth-service.js';

export function memberAccessDecision(session) {
  return session
    ? { allowed: true, redirectTo: null }
    : { allowed: false, redirectTo: 'auth.html?next=mypage.html' };
}

export async function requireMember() {
  const decision = memberAccessDecision(await getSession());
  if (!decision.allowed && globalThis.location) globalThis.location.replace(decision.redirectTo);
  return decision.allowed ? getSession() : null;
}

export async function redirectSignedIn() {
  const session = await getSession();
  if (session && globalThis.location) globalThis.location.replace('mypage.html');
  return session;
}
