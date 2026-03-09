import type { PickedField, RiskCheckResult } from '../../types/prompt-graph';

const SENSITIVE_PATTERNS = [
  /password/i,
  /passcode/i,
  /otp/i,
  /2fa/i,
  /token/i,
  /secret/i,
  /ssn/i,
  /social security/i,
  /credit card/i,
  /cvv/i,
  /iban/i,
  /routing/i,
];

export const assessFieldRisk = (field: PickedField): RiskCheckResult => {
  const hint = `${field.selector} ${field.type} ${field.name ?? ''} ${field.id ?? ''} ${field.label ?? ''} ${field.placeholder ?? ''}`;
  const matches = SENSITIVE_PATTERNS.filter((pattern) => pattern.test(hint));

  if (matches.length > 0) {
    return {
      blocked: true,
      reason: 'Sensitive field detected; fill blocked by risk policy.',
      fieldSelector: field.selector,
      confidence: Math.min(1, 0.75 + matches.length * 0.1),
      riskFlags: ['sensitive_field'],
    };
  }

  return {
    blocked: false,
    confidence: 0.2,
    riskFlags: [],
  };
};

export const assessDomainRisk = (url: string): RiskCheckResult => {
  if (!url) {
    return {
      blocked: false,
      confidence: 0,
      riskFlags: [],
    };
  }

  const host = new URL(url).hostname;
  if (/bank|wallet|payment|auth|secure/i.test(host)) {
    return {
      blocked: false,
      reason: 'Sensitive domain detected; confirmation recommended.',
      confidence: 0.7,
      riskFlags: ['sensitive_domain'],
    };
  }

  return {
    blocked: false,
    confidence: 0.1,
    riskFlags: [],
  };
};
