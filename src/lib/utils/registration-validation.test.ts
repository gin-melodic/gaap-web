import { describe, expect, it } from 'vitest';
import {
  MAX_EMAIL_LENGTH,
  validateRegistrationFields,
} from './registration-validation';

describe('validateRegistrationFields', () => {
  it('accepts valid registration fields', () => {
    expect(validateRegistrationFields('user+beta@example.com', 'StrongPass123', 'StrongPass123')).toBeNull();
  });

  it('rejects an email longer than 255 characters', () => {
    const email = `${'a'.repeat(MAX_EMAIL_LENGTH - '@example.com'.length + 1)}@example.com`;
    expect(validateRegistrationFields(email, 'StrongPass123', 'StrongPass123')).toBe('email_too_long');
  });

  it('accepts an email exactly 255 characters long', () => {
    const email = `${'a'.repeat(MAX_EMAIL_LENGTH - '@example.com'.length)}@example.com`;
    expect(validateRegistrationFields(email, 'StrongPass123', 'StrongPass123')).toBeNull();
  });

  it.each([
    ['seven ASCII characters', '1234567'],
    ['seven Unicode characters', '密码测试123'],
    ['more than 100 characters', 'x'.repeat(101)],
  ])('rejects %s', (_name, password) => {
    expect(validateRegistrationFields('user@example.com', password, password)).toBe('password_length_invalid');
  });

  it('accepts Unicode passwords containing at least eight characters', () => {
    expect(validateRegistrationFields('user@example.com', '密码测试12345', '密码测试12345')).toBeNull();
  });

  it('rejects mismatched passwords', () => {
    expect(validateRegistrationFields('user@example.com', 'StrongPass123', 'StrongPass124')).toBe('password_mismatch');
  });
});
