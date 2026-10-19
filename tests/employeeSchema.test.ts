import { employeeProfileSchema } from '@/features/employees/schemas/employeeSchema';

describe('employeeProfileSchema', () => {
  it('accepts a valid profile', () => {
    const parsed = employeeProfileSchema.parse({
      employeeCode: 'E001',
      fullName: 'Ada Lovelace',
      department: 'Engineering',
      designation: 'Engineer',
      email: 'ada@example.com',
    });
    expect(parsed.fullName).toBe('Ada Lovelace');
  });

  it('rejects short names and invalid email', () => {
    const result = employeeProfileSchema.safeParse({
      employeeCode: 'E',
      fullName: 'A',
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('allows empty optional email', () => {
    const parsed = employeeProfileSchema.parse({
      employeeCode: 'E002',
      fullName: 'Grace Hopper',
      email: '',
    });
    expect(parsed.email).toBe('');
  });
});
