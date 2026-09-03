export const MAX_EMAIL_LENGTH = 255;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 100;

export type RegistrationValidationError =
  | 'email_too_long'
  | 'password_length_invalid'
  | 'password_mismatch';

export function countUnicodeCharacters(value: string): number {
  return Array.from(value).length;
}

export function validateRegistrationFields(
  email: string,
  password: string,
  confirmPassword: string,
): RegistrationValidationError | null {
  if (email.length > MAX_EMAIL_LENGTH) {
    return 'email_too_long';
  }

  const passwordLength = countUnicodeCharacters(password);
  if (passwordLength < MIN_PASSWORD_LENGTH || passwordLength > MAX_PASSWORD_LENGTH) {
    return 'password_length_invalid';
  }

  if (password !== confirmPassword) {
    return 'password_mismatch';
  }

  return null;
}
