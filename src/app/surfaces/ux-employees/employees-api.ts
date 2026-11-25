import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BffClient } from '../../shared/http';

/** Dependent devolvido por GET employee / dependents (OpenAPI DependentRead). */
export interface DependentRead {
  id: string;
  enabled: boolean;
  name: string;
  birthDate: string;
  dependencyType: string;
  status: 'Active' | 'Inactive';
}

/** Corpo de POST/PUT de Dependent (OpenAPI DependentWrite). */
export interface DependentWrite {
  name: string;
  birthDate: string;
  dependencyType: string;
  status: 'Active' | 'Inactive';
}

/** Employee devolvido por GET /api/v1/employees (OpenAPI EmployeeRead). */
export interface EmployeeRead {
  id: string;
  enabled: boolean;
  registrationNumber: string;
  name: string;
  salary: number;
  hireDate: string;
  position: string;
  status: 'Active' | 'Inactive';
  dependents: DependentRead[];
  phone?: string;
  email?: string;
}

/** Corpo de POST/PUT de Employee (OpenAPI EmployeeWrite). */
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

@Injectable({ providedIn: 'root' })
export class EmployeesApi {
  private readonly bff = inject(BffClient);

  /** GET `/api/v1/employees` via BffClient (`bffBaseUrl` + `/v1/employees`). */
  list(): Observable<EmployeeRead[]> {
    return this.bff.get<EmployeeRead[]>('/v1/employees');
  }

  /** GET `/api/v1/employees/{id}` — aggregate com dependents visíveis. */
  getById(id: string): Observable<EmployeeRead> {
    return this.bff.get<EmployeeRead>(`/v1/employees/${id}`);
  }

  /** POST `/api/v1/employees` → 201 EmployeeCreated (lido como EmployeeRead sem dependents). */
  create(body: EmployeeWrite): Observable<EmployeeRead> {
    return this.bff.post<EmployeeRead>('/v1/employees', body);
  }

  /** PUT `/api/v1/employees/{id}` — full replace; dependents no servidor permanecem. */
  replace(id: string, body: EmployeeWrite): Observable<EmployeeRead> {
    return this.bff.put<EmployeeRead>(`/v1/employees/${id}`, body);
  }

  /** GET `/api/v1/employees/{id}/dependents`. */
  listDependents(employeeId: string): Observable<DependentRead[]> {
    return this.bff.get<DependentRead[]>(
      `/v1/employees/${employeeId}/dependents`,
    );
  }

  /** POST `/api/v1/employees/{id}/dependents`. */
  createDependent(
    employeeId: string,
    body: DependentWrite,
  ): Observable<DependentRead> {
    return this.bff.post<DependentRead>(
      `/v1/employees/${employeeId}/dependents`,
      body,
    );
  }

  /** PUT `/api/v1/employees/{id}/dependents/{dependentId}`. */
  replaceDependent(
    employeeId: string,
    dependentId: string,
    body: DependentWrite,
  ): Observable<DependentRead> {
    return this.bff.put<DependentRead>(
      `/v1/employees/${employeeId}/dependents/${dependentId}`,
      body,
    );
  }

  /** DELETE `/api/v1/employees/{id}/dependents/{dependentId}` → 204. */
  deleteDependent(
    employeeId: string,
    dependentId: string,
  ): Observable<void> {
    return this.bff.delete<void>(
      `/v1/employees/${employeeId}/dependents/${dependentId}`,
    );
  }
}
