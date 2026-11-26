/**
 * Default WRITE_ROLES of the resources service (backend/resources env.config).
 * Covers resource create/edit and occurrence register/resolve. UI hint only:
 * the service still enforces it and answers 403.
 */
export const RESOURCE_WRITE_ROLES: readonly string[] = [
  'funcionario',
  'administrator',
];

export function hasResourceWriteRole(papeis: readonly string[] | undefined): boolean {
  const roles = papeis ?? [];
  return RESOURCE_WRITE_ROLES.some((role) => roles.includes(role));
}
