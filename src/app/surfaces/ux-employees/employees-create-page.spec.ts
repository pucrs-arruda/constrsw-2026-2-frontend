import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, Router } from '@angular/router';
import { BehaviorSubject, Observable, of, map } from 'rxjs';
import { AuthSession } from '../../shell/auth-session';
import { IdentityApi } from '../../shell/identity-api';
import { EmployeesCreatePage } from './employees-create-page';

describe('EmployeesCreatePage', () => {
  let router: Router;
  let dialogOpen: ReturnType<typeof vi.fn>;
  let compact$: BehaviorSubject<boolean>;
  let me$: BehaviorSubject<{ sub: string; papeis: string[] }>;
  let session: { isAuthenticated: boolean };

  beforeEach(async () => {
    compact$ = new BehaviorSubject(false);
    dialogOpen = vi.fn();
    me$ = new BehaviorSubject({ sub: 'user-1', papeis: ['funcionario'] });
    session = { isAuthenticated: true };

    const bpObserver: BreakpointObserver = {
      isMatched: (query: string) =>
        query.includes('599') ? compact$.value : false,
      observe: (value: string | readonly string[]) => {
        const query = Array.isArray(value) ? String(value[0]) : String(value);
        const source = query.includes('599')
          ? compact$
          : new BehaviorSubject(false);
        return source.pipe(
          map((matches) => ({ matches, breakpoints: {} })),
        ) as Observable<BreakpointState>;
      },
      ngOnDestroy: () => undefined,
    } as BreakpointObserver;

    await TestBed.configureTestingModule({
      imports: [EmployeesCreatePage],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        { provide: BreakpointObserver, useValue: bpObserver },
        {
          provide: MatDialog,
          useValue: { open: dialogOpen, closeAll: vi.fn() },
        },
        {
          provide: IdentityApi,
          useValue: { me: () => me$.asObservable() },
        },
        {
          provide: AuthSession,
          useValue: session,
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('opens create dialog and navigates to detail on success id', async () => {
    dialogOpen.mockReturnValue({
      afterClosed: () => of({ id: 'emp-new' }),
      componentInstance: {},
    } as unknown as MatDialogRef<unknown, { id: string } | false>);

    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(EmployeesCreatePage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dialogOpen).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/funcionarios/emp-new');
  });

  it('navigates back to list when dialog closes without id while authenticated', async () => {
    dialogOpen.mockReturnValue({
      afterClosed: () => of(false),
      componentInstance: {},
    } as unknown as MatDialogRef<unknown, { id: string } | false>);

    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(EmployeesCreatePage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith('/funcionarios');
  });

  it('does not navigate to list after 401 close when session cleared', async () => {
    session.isAuthenticated = false;
    dialogOpen.mockReturnValue({
      afterClosed: () => of(false),
      componentInstance: {},
    } as unknown as MatDialogRef<unknown, { id: string } | false>);

    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(EmployeesCreatePage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('redirects to list when role is not funcionario', async () => {
    me$.next({ sub: 'user-1', papeis: ['professor'] });
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(EmployeesCreatePage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dialogOpen).not.toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/funcionarios');
  });
});
