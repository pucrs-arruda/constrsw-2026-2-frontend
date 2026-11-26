import { hasResourceWriteRole } from './resource-permissions';

describe('hasResourceWriteRole', () => {
  it('accepts the resources service WRITE_ROLES', () => {
    expect(hasResourceWriteRole(['funcionario'])).toBe(true);
    expect(hasResourceWriteRole(['student', 'administrator'])).toBe(true);
  });

  it('rejects read-only or missing roles', () => {
    expect(hasResourceWriteRole(['professor', 'student'])).toBe(false);
    expect(hasResourceWriteRole([])).toBe(false);
    expect(hasResourceWriteRole(undefined)).toBe(false);
  });
});
