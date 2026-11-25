import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { BehaviorSubject, Observable, firstValueFrom, map } from 'rxjs';
import { ConfirmDialog, openConfirmDialog } from './confirm-dialog';

describe('ConfirmDialog', () => {
  let compact$: BehaviorSubject<boolean>;
  let dialog: MatDialog;
  let breakpoints: BreakpointObserver;

  beforeEach(async () => {
    compact$ = new BehaviorSubject(false);

    breakpoints = {
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
      imports: [MatDialogModule, ConfirmDialog],
      providers: [
        provideAnimationsAsync(),
        { provide: BreakpointObserver, useValue: breakpoints },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            title: 'Excluir item',
            message: 'Esta ação não pode ser desfeita.',
          },
        },
        {
          provide: MatDialogRef,
          useValue: { close: vi.fn() },
        },
      ],
    }).compileComponents();

    dialog = TestBed.inject(MatDialog);
  });

  afterEach(() => {
    dialog.closeAll();
  });

  it('renders title, message and default actions', () => {
    const fixture = TestBed.createComponent(ConfirmDialog);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance.confirmLabel).toBe('Confirmar');
    expect(fixture.componentInstance.cancelLabel).toBe('Cancelar');
    expect(el.textContent).toContain('Excluir item');
    expect(el.textContent).toContain('Esta ação não pode ser desfeita.');
    expect(el.textContent).toContain('Confirmar');
    expect(el.textContent).toContain('Cancelar');
  });

  it('closes with true on confirm and false on cancel', async () => {
    const ref = openConfirmDialog(
      dialog,
      { title: 'Confirmar', message: 'Ok?' },
      breakpoints,
    );
    const resultPromise = firstValueFrom(ref.afterClosed());
    ref.componentInstance.confirm();
    await expect(resultPromise).resolves.toBe(true);

    const ref2 = openConfirmDialog(
      dialog,
      { title: 'Confirmar', message: 'Ok?' },
      breakpoints,
    );
    const result2 = firstValueFrom(ref2.afterClosed());
    ref2.componentInstance.cancel();
    await expect(result2).resolves.toBe(false);
  });

  it('stacks actions in compact panel class', () => {
    compact$.next(true);
    const fixture = TestBed.createComponent(ConfirmDialog);
    fixture.detectChanges();

    openConfirmDialog(
      dialog,
      {
        title: 'Título',
        message: 'Msg',
        confirmLabel: 'Sim',
        cancelLabel: 'Não',
      },
      breakpoints,
    );
    expect(
      document.querySelector('.app-confirm-dialog--compact'),
    ).not.toBeNull();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.confirm-dialog__actions--stack',
      ),
    ).not.toBeNull();
  });
});
