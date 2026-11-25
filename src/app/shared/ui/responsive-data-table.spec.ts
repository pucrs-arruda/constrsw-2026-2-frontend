import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { BehaviorSubject, Observable, map } from 'rxjs';
import {
  DataTableColumn,
  DataTableRow,
  ResponsiveDataTable,
} from './responsive-data-table';

@Component({
  standalone: true,
  imports: [ResponsiveDataTable],
  template: `
    <app-responsive-data-table
      [columns]="columns"
      [rows]="rows"
      (openRow)="opened = $event"
      (editRow)="edited = $event"
      (deleteRow)="deleted = $event"
    />
  `,
})
class Host {
  columns: DataTableColumn[] = [
    { key: 'name', header: 'Nome', priority: 'high' },
    { key: 'email', header: 'E-mail', priority: 'high' },
    { key: 'role', header: 'Papel', priority: 'low' },
  ];
  rows: DataTableRow[] = [
    { id: '1', name: 'Ana Silva', email: 'ana@example.com', role: 'Ops' },
  ];
  opened: DataTableRow | null = null;
  edited: DataTableRow | null = null;
  deleted: DataTableRow | null = null;
}

describe('ResponsiveDataTable', () => {
  let compact$: BehaviorSubject<boolean>;
  let fullColumns$: BehaviorSubject<boolean>;

  beforeEach(async () => {
    compact$ = new BehaviorSubject(false);
    fullColumns$ = new BehaviorSubject(true);

    const bpObserver: BreakpointObserver = {
      isMatched: (query: string) => {
        if (query.includes('599')) {
          return compact$.value;
        }
        if (query.includes('1280')) {
          return fullColumns$.value;
        }
        return false;
      },
      observe: (value: string | readonly string[]) => {
        const query = Array.isArray(value) ? String(value[0]) : String(value);
        const source = query.includes('599')
          ? compact$
          : query.includes('1280')
            ? fullColumns$
            : new BehaviorSubject(false);
        return source.pipe(
          map((matches) => ({ matches, breakpoints: {} })),
        ) as Observable<BreakpointState>;
      },
      ngOnDestroy: () => undefined,
    } as BreakpointObserver;

    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        provideAnimationsAsync(),
        { provide: BreakpointObserver, useValue: bpObserver },
      ],
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  }

  it('renders mat-table with all columns at ≥1280', () => {
    compact$.next(false);
    fullColumns$.next(true);
    const fixture = create();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('table[mat-table]')).not.toBeNull();
    expect(el.querySelector('.rdt-list')).toBeNull();
    expect(el.textContent).toContain('Ana Silva');
    expect(el.textContent).toContain('Ops');
    expect(el.textContent).toContain('Abrir');
  });

  it('hides low-priority columns between 600 and 1279', () => {
    compact$.next(false);
    fullColumns$.next(false);
    const fixture = create();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('table[mat-table]')).not.toBeNull();
    expect(el.textContent).toContain('Ana Silva');
    expect(el.textContent).not.toContain('Ops');
    expect(el.textContent).not.toContain('Papel');
  });

  it('renders 2-line list + Mais ações in compact viewport', () => {
    compact$.next(true);
    fullColumns$.next(false);
    const fixture = create();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('table[mat-table]')).toBeNull();
    expect(el.querySelector('.rdt-list')).not.toBeNull();
    expect(el.querySelector('.rdt-list__primary')?.textContent?.trim()).toBe(
      'Ana Silva',
    );
    expect(el.querySelector('.rdt-list__secondary')?.textContent?.trim()).toBe(
      'ana@example.com',
    );
    expect(el.textContent).toContain('Mais ações');
  });

  it('opens row when compact list text is clicked', () => {
    compact$.next(true);
    const fixture = create();
    const host = fixture.componentInstance;
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('.rdt-list__text') as HTMLButtonElement).click();
    expect(host.opened?.id).toBe('1');
  });
});
