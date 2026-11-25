import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import {
  EmployeesApi,
  type DependentRead,
  type DependentWrite,
  type EmployeeRead,
  type EmployeeWrite,
} from './employees-api';

const DEPENDENT: DependentRead = {
  id: 'dep-1',
  enabled: true,
  name: 'Caio Costa',
  birthDate: '2010-05-01',
  dependencyType: 'filho',
  status: 'Active',
};

const EMPLOYEE: EmployeeRead = {
  id: 'emp-1',
  enabled: true,
  registrationNumber: '100',
  name: 'Helena Costa',
  salary: 8500.5,
  hireDate: '2020-01-15',
  position: 'Analista',
  status: 'Active',
  dependents: [DEPENDENT],
  email: 'helena.costa@pucrs.br',
};

describe('EmployeesApi', () => {
  let api: EmployeesApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(EmployeesApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('getById GETs /v1/employees/:id', () => {
    let result: EmployeeRead | undefined;
    api.getById('emp-1').subscribe((value) => {
      result = value;
    });

    const req = http.expectOne(`${environment.bffBaseUrl}/v1/employees/emp-1`);
    expect(req.request.method).toBe('GET');
    req.flush(EMPLOYEE);
    expect(result).toEqual(EMPLOYEE);
  });

  it('create POSTs EmployeeWrite to /v1/employees', () => {
    const body: EmployeeWrite = {
      registrationNumber: '100',
      name: 'Helena Costa',
      salary: 8500.5,
      hireDate: '2020-01-15',
      position: 'Analista',
      status: 'Active',
      email: 'helena.costa@pucrs.br',
    };
    let result: EmployeeRead | undefined;
    api.create(body).subscribe((value) => {
      result = value;
    });

    const req = http.expectOne(`${environment.bffBaseUrl}/v1/employees`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ ...EMPLOYEE, dependents: [] });
    expect(result?.id).toBe('emp-1');
    expect(result?.name).toBe('Helena Costa');
  });

  it('replace PUTs EmployeeWrite to /v1/employees/:id', () => {
    const body: EmployeeWrite = {
      registrationNumber: '100',
      name: 'Helena Costa',
      salary: 9000,
      hireDate: '2020-01-15',
      position: 'Analista Sênior',
      status: 'Inactive',
      phone: '',
      email: 'helena.costa@pucrs.br',
    };
    let result: EmployeeRead | undefined;
    api.replace('emp-1', body).subscribe((value) => {
      result = value;
    });

    const req = http.expectOne(
      `${environment.bffBaseUrl}/v1/employees/emp-1`,
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({
      ...EMPLOYEE,
      salary: 9000,
      position: 'Analista Sênior',
      status: 'Inactive',
    });
    expect(result?.status).toBe('Inactive');
    expect(result?.position).toBe('Analista Sênior');
  });

  it('listDependents GETs secondary collection', () => {
    let result: DependentRead[] | undefined;
    api.listDependents('emp-1').subscribe((value) => {
      result = value;
    });

    const req = http.expectOne(
      `${environment.bffBaseUrl}/v1/employees/emp-1/dependents`,
    );
    expect(req.request.method).toBe('GET');
    req.flush([DEPENDENT]);
    expect(result).toEqual([DEPENDENT]);
  });

  it('createDependent POSTs DependentWrite', () => {
    const body: DependentWrite = {
      name: 'Caio Costa',
      birthDate: '2010-05-01',
      dependencyType: 'filho',
      status: 'Active',
    };
    let result: DependentRead | undefined;
    api.createDependent('emp-1', body).subscribe((value) => {
      result = value;
    });

    const req = http.expectOne(
      `${environment.bffBaseUrl}/v1/employees/emp-1/dependents`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(DEPENDENT);
    expect(result).toEqual(DEPENDENT);
  });

  it('replaceDependent PUTs DependentWrite', () => {
    const body: DependentWrite = {
      name: 'Caio Costa',
      birthDate: '2010-05-01',
      dependencyType: 'filho',
      status: 'Inactive',
    };
    api.replaceDependent('emp-1', 'dep-1', body).subscribe();

    const req = http.expectOne(
      `${environment.bffBaseUrl}/v1/employees/emp-1/dependents/dep-1`,
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({ ...DEPENDENT, status: 'Inactive' });
  });

  it('deleteDependent DELETEs and accepts 204', () => {
    let completed = false;
    api.deleteDependent('emp-1', 'dep-1').subscribe({
      next: () => {
        completed = true;
      },
    });

    const req = http.expectOne(
      `${environment.bffBaseUrl}/v1/employees/emp-1/dependents/dep-1`,
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(completed).toBe(true);
  });
});
