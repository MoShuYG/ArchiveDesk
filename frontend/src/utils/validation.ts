import type { MessageKey } from '../i18n';

export type ValidationResult =
  | { valid: true; messageKey: null }
  | { valid: false; messageKey: MessageKey };

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { valid: false, messageKey: 'validation.passwordRequired' };
  }
  if (password.length < 8) {
    return { valid: false, messageKey: 'validation.passwordTooShort' };
  }
  if (password.length > 256) {
    return { valid: false, messageKey: 'validation.passwordTooLong' };
  }
  return { valid: true, messageKey: null };
}

export function validatePath(path: string): ValidationResult {
  if (!path || !path.trim()) {
    return { valid: false, messageKey: 'validation.pathRequired' };
  }
  return { valid: true, messageKey: null };
}

export function validateRootName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return { valid: false, messageKey: 'validation.nameRequired' };
  }
  if (name.length > 128) {
    return { valid: false, messageKey: 'validation.nameTooLong' };
  }
  return { valid: true, messageKey: null };
}
