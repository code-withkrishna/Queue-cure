import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isStaffEmail } from '@/lib/staff-auth';

describe('staff-auth', () => {
  const original = { ...process.env };

  beforeEach(() => {
    delete process.env.STAFF_ALLOWED_EMAILS;
    delete process.env.STAFF_EMAIL_DOMAINS;
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it('allows any email in demo mode when unset', () => {
    expect(isStaffEmail('anyone@example.com')).toBe(true);
  });

  it('checks allowed emails list', () => {
    process.env.STAFF_ALLOWED_EMAILS = 'admin@clinic.com';
    expect(isStaffEmail('admin@clinic.com')).toBe(true);
    expect(isStaffEmail('other@clinic.com')).toBe(false);
  });

  it('checks allowed domains', () => {
    process.env.STAFF_EMAIL_DOMAINS = 'clinic.com';
    expect(isStaffEmail('reception@clinic.com')).toBe(true);
    expect(isStaffEmail('user@gmail.com')).toBe(false);
  });
});
