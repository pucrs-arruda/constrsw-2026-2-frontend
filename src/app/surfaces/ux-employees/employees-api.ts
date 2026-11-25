import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BffClient } from '../../shared/http';

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
  dependents: unknown[];
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
}
