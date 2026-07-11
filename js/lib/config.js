export function validatePublicConfig(input) {
  const supabaseUrl = String(input?.supabaseUrl || '');
  const supabasePublishableKey = String(input?.supabasePublishableKey || '');

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)) {
    throw new Error('Invalid Supabase URL');
  }

  if (!supabasePublishableKey || /service_role|secret/i.test(supabasePublishableKey)) {
    throw new Error('A browser-safe publishable key is required');
  }

  return { supabaseUrl, supabasePublishableKey };
}

export function isPublicConfigReady(input) {
  try {
    const config = validatePublicConfig(input);
    return config.supabaseUrl !== 'https://example.supabase.co'
      && !/replace_me|example/i.test(config.supabasePublishableKey);
  } catch {
    return false;
  }
}

export function getPublicConfig() {
  return validatePublicConfig(globalThis.CLEANING_CONFIG);
}
