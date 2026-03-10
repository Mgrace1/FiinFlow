export interface PasswordRule {
  label: string;
  passed: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  rules: PasswordRule[];
}

export const validateStrongPassword = (password: string): PasswordValidationResult => {
  const rules: PasswordRule[] = [
    { label: 'At least 8 characters', passed: password.length >= 8 },
    { label: 'At least one uppercase letter', passed: /[A-Z]/.test(password) },
    { label: 'At least one lowercase letter', passed: /[a-z]/.test(password) },
    { label: 'At least one number', passed: /[0-9]/.test(password) },
    { label: 'At least one special character', passed: /[^A-Za-z0-9]/.test(password) },
  ];

  return {
    isValid: rules.every((rule) => rule.passed),
    rules,
  };
};

export const strongPasswordErrorMessage =
  'Password must be strong: 8+ characters, uppercase, lowercase, number, and special character.';

const passwordRuleKeyMap: Record<string, string> = {
  'At least 8 characters': 'password.rule.min_length',
  'At least one uppercase letter': 'password.rule.uppercase',
  'At least one lowercase letter': 'password.rule.lowercase',
  'At least one number': 'password.rule.number',
  'At least one special character': 'password.rule.special',
};

export const getPasswordRuleKey = (label: string): string =>
  passwordRuleKeyMap[label] ?? label;
