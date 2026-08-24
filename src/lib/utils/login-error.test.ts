import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/network/errors';
import { classifyLoginError } from './login-error';

describe('classifyLoginError', () => {
  it('classifies a login 401 as invalid credentials even when the server message has extra context', () => {
    const error = new ApiError('invalid email or password\nrequest failed', 401);

    expect(classifyLoginError(error)).toBe('invalid-credentials');
  });

  it('classifies the credential message without relying on exact casing or whitespace', () => {
    const error = new Error('  Invalid Email Or Password  ');

    expect(classifyLoginError(error)).toBe('invalid-credentials');
  });

  it('classifies a serialized 401 without relying on ApiError identity', () => {
    const error = { name: 'ApiError', message: 'Unauthorized', code: 401 };

    expect(classifyLoginError(error)).toBe('invalid-credentials');
  });

  it('keeps the two-factor challenge distinct from other authentication errors', () => {
    const error = new ApiError('2FA code required', 401);

    expect(classifyLoginError(error)).toBe('two-factor-required');
  });

  it('uses the generic path for network and unexpected errors', () => {
    expect(classifyLoginError(new Error('Failed to fetch'))).toBe('generic');
    expect(classifyLoginError('unexpected rejection')).toBe('generic');
  });
});
