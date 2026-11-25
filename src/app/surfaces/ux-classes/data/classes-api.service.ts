import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { BffClient } from '../../../shared/http';
import {
  ClassCreatePayload,
  ClassItem,
  ClassPatchPayload,
  ClassesLookups,
  CourseLookup,
  LookupDomain,
  ProfessorLookup,
  RoomLookup,
  StudentLookup,
} from './classes.models';

@Injectable({ providedIn: 'root' })
export class ClassesApiService {
  private readonly bff = inject(BffClient);

  listClasses(): Observable<ClassItem[]> {
    return this.bff.get<ClassItem[]>('/v1/classes');
  }

  getClass(id: string): Observable<ClassItem> {
    return this.bff.get<ClassItem>(`/v1/classes/${encodeURIComponent(id)}`);
  }

  createClass(payload: ClassCreatePayload): Observable<ClassItem> {
    return this.bff.post<ClassItem>('/v1/classes', payload);
  }

  patchClass(id: string, payload: ClassPatchPayload): Observable<ClassItem> {
    return this.bff.patch<ClassItem>(
      `/v1/classes/${encodeURIComponent(id)}`,
      payload,
    );
  }

  deleteClass(id: string): Observable<void> {
    return this.bff.delete<void>(`/v1/classes/${encodeURIComponent(id)}`);
  }

  listStudents(): Observable<StudentLookup[]> {
    return this.bff.get<StudentLookup[]>('/v1/students');
  }

  /**
   * Auxiliary lookups for friendly labels and select pickers.
   * Failures degrade gracefully so the primary `classes` screen never breaks.
   */
  loadLookups(): Observable<ClassesLookups> {
    return forkJoin({
      courses: this.bff.get<CourseLookup[]>('/v1/courses').pipe(
        map((items) => ({ items: Array.isArray(items) ? items : [], ok: true })),
        catchError(() => of({ items: [] as CourseLookup[], ok: false })),
      ),
      professors: this.bff.get<ProfessorLookup[]>('/v1/professors').pipe(
        map((items) => ({ items: Array.isArray(items) ? items : [], ok: true })),
        catchError(() => of({ items: [] as ProfessorLookup[], ok: false })),
      ),
      rooms: this.bff.get<RoomLookup[]>('/v1/rooms').pipe(
        map((items) => ({ items: Array.isArray(items) ? items : [], ok: true })),
        catchError(() => of({ items: [] as RoomLookup[], ok: false })),
      ),
    }).pipe(
      map(({ courses, professors, rooms }) => {
        const unavailable: LookupDomain[] = [];
        if (!courses.ok) {
          unavailable.push('courses');
        }
        if (!professors.ok) {
          unavailable.push('professors');
        }
        if (!rooms.ok) {
          unavailable.push('rooms');
        }
        return {
          courses: courses.items,
          professors: professors.items,
          rooms: rooms.items,
          unavailable,
        };
      }),
    );
  }
}
