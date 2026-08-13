export type LoginErrorKind = 'two-factor-required' | 'invalid-credentials' | 'generic';

export function classifyLoginError(error: unknown): LoginErrorKind {
  const errorLike = typeof error === 'object' && error !== null
    ? error as { code?: unknown; message?: unknown }
    : undefined;
  const message = errorLike && typeof errorLike.message === 'string'
    ? errorLike.message.trim().toLowerCase()
    : '';
  const code = errorLike && typeof errorLike.code === 'number'
    ? errorLike.code
    : undefined;

  if (message.includes('2fa code required')) {
    return 'two-factor-required';
  }

  if (code === 401 || message.includes('invalid email or password')) {
    return 'invalid-credentials';
  }

  return 'generic';
}
