import { E2E_EMPLOYEES_URL, E2E_PREFIX } from './env';

export interface EmployeeWrite {
  registrationNumber: string;
  name: string;
  salary: number;
  hireDate: string;
  position: string;
  status: 'Active' | 'Inactive';
  phone?: string;
  email?: string;
}

export interface DependentWrite {
  name: string;
  birthDate: string;
  dependencyType: string;
  status: 'Active' | 'Inactive';
}

export interface DependentRead extends DependentWrite {
  id: string;
  enabled: boolean;
}

export interface EmployeeRead extends EmployeeWrite {
  id: string;
  enabled: boolean;
  dependents: DependentRead[];
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

export async function listEmployees(token: string): Promise<EmployeeRead[]> {
  const res = await fetch(`${E2E_EMPLOYEES_URL}/api/v1/employees`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(`list employees: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as EmployeeRead[];
}

export async function createEmployee(
  token: string,
  body: EmployeeWrite,
): Promise<EmployeeRead> {
  const res = await fetch(`${E2E_EMPLOYEES_URL}/api/v1/employees`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`create employee: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as EmployeeRead;
}

export async function createDependent(
  token: string,
  employeeId: string,
  body: DependentWrite,
): Promise<DependentRead> {
  const res = await fetch(
    `${E2E_EMPLOYEES_URL}/api/v1/employees/${employeeId}/dependents`,
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    throw new Error(`create dependent: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as DependentRead;
}

export async function deleteEmployee(
  token: string,
  id: string,
): Promise<void> {
  const res = await fetch(`${E2E_EMPLOYEES_URL}/api/v1/employees/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (res.status === 404) {
    return;
  }
  if (!res.ok && res.status !== 204) {
    throw new Error(`delete employee: ${res.status} ${await res.text()}`);
  }
}

export async function deleteDependent(
  token: string,
  employeeId: string,
  dependentId: string,
): Promise<void> {
  const res = await fetch(
    `${E2E_EMPLOYEES_URL}/api/v1/employees/${employeeId}/dependents/${dependentId}`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    },
  );
  if (res.status === 404) {
    return;
  }
  if (!res.ok && res.status !== 204) {
    throw new Error(`delete dependent: ${res.status} ${await res.text()}`);
  }
}

/** Remove qualquer registro cuja matrícula ou nome começa com `E2E-`. */
export async function purgeE2eEmployees(token: string): Promise<number> {
  const all = await listEmployees(token);
  const targets = all.filter(
    (e) =>
      e.registrationNumber?.startsWith(E2E_PREFIX) ||
      e.name?.startsWith(E2E_PREFIX),
  );
  for (const emp of targets) {
    const detailRes = await fetch(
      `${E2E_EMPLOYEES_URL}/api/v1/employees/${emp.id}`,
      { headers: authHeaders(token) },
    );
    if (detailRes.ok) {
      const detail = (await detailRes.json()) as EmployeeRead;
      for (const dep of detail.dependents ?? []) {
        if (
          dep.name?.startsWith(E2E_PREFIX) ||
          emp.registrationNumber?.startsWith(E2E_PREFIX)
        ) {
          await deleteDependent(token, emp.id, dep.id);
        }
      }
    }
    await deleteEmployee(token, emp.id);
  }
  return targets.length;
}

export function seedEmployeeBody(
  suffix: string,
): EmployeeWrite {
  return {
    registrationNumber: `${E2E_PREFIX}${suffix}`,
    name: `${E2E_PREFIX}Funcionario ${suffix}`,
    salary: 4500.5,
    hireDate: '2024-03-01',
    position: 'Analista E2E',
    status: 'Active',
    phone: '+55 51 99999-0001',
    email: `e2e.${suffix.toLowerCase()}@pucrs.br`,
  };
}

export function seedDependentBody(suffix: string): DependentWrite {
  return {
    name: `${E2E_PREFIX}Dependente ${suffix}`,
    birthDate: '2015-06-15',
    dependencyType: 'Filho(a)',
    status: 'Active',
  };
}
