import { describe, expect, it } from 'vitest';
import { assessDomainRisk, assessFieldRisk } from '../lib/prompt-graph/risk';

describe('risk policy', () => {
  it('blocks sensitive fields', () => {
    const result = assessFieldRisk({
      selector: '#password',
      type: 'password',
      label: 'Password',
    });

    expect(result.blocked).toBe(true);
    expect(result.riskFlags).toContain('sensitive_field');
  });

  it('flags sensitive domains for confirmation', () => {
    const result = assessDomainRisk('https://secure-banking.example.com/transfer');

    expect(result.blocked).toBe(false);
    expect(result.riskFlags).toContain('confirm_before_force');
  });
});
