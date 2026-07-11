import { getSupabase } from '../lib/supabase.js';
import { validateEmail, validatePassword } from './auth-validation.js';

function assertNoError(result) {
  if (result.error) throw result.error;
  return result.data;
}

function runtimeLocation() {
  const basePath = globalThis.location?.pathname?.replace(/[^/]*$/, '') || '/';
  return { origin: globalThis.location?.origin || '', basePath };
}

export function createAuthService(getClient, locationAdapter) {
  return {
    async signUp({ email, password, displayName }) {
      const normalizedEmail = validateEmail(email);
      const client = await getClient();
      return assertNoError(await client.auth.signUp({
        email: normalizedEmail,
        password: validatePassword(password),
        options: {
          data: {
            display_name: String(displayName || '').trim(),
          },
        },
      }));
    },

    async signIn({ email, password }) {
      const client = await getClient();
      return assertNoError(await client.auth.signInWithPassword({
        email: validateEmail(email),
        password: String(password || ''),
      }));
    },

    async signOut() {
      const client = await getClient();
      assertNoError(await client.auth.signOut());
    },

    async requestPasswordReset(email) {
      const client = await getClient();
      const redirectTo = `${locationAdapter.origin}${locationAdapter.basePath}auth.html?mode=reset`;
      assertNoError(await client.auth.resetPasswordForEmail(validateEmail(email), { redirectTo }));
    },

    async getSession() {
      const client = await getClient();
      const data = assertNoError(await client.auth.getSession());
      return data.session;
    },
  };
}

const authService = createAuthService(getSupabase, runtimeLocation());

export const signUp = authService.signUp;
export const signIn = authService.signIn;
export const signOut = authService.signOut;
export const requestPasswordReset = authService.requestPasswordReset;
export const getSession = authService.getSession;
