import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { BehaviorSubject, Observable, firstValueFrom, map } from 'rxjs';
import {
  EDIT_DIALOG_STANDARD_WIDTH,
  EditDialogLayout,
  editDialogConfig,
  openEditDialog,
} from './edit-dialog';

@Component({
  standalone: true,
  imports: [EditDialogLayout, MatDialogModule],
  template: `
    <app-edit-dialog-layout [dialogTitle]="data.title">
      <p class="edit-body">Conteúdo do formulário</p>
      <div editActions>
        <button type="button" mat-dialog-close>Cancelar</button>
        <button type="button" (click)="save()">Salvar</button>
      </div>
    </app-edit-dialog-layout>
  `,
})
class SampleEditDialog {
  readonly data = inject<{ title: string }>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<SampleEditDialog, string>);

  save(): void {
    this.ref.close('saved');
  }
}

describe('EditDialog', () => {
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
      imports: [MatDialogModule, SampleEditDialog, EditDialogLayout],
      providers: [
        provideAnimationsAsync(),
        { provide: BreakpointObserver, useValue: breakpoints },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
      ],
    }).compileComponents();

    dialog = TestBed.inject(MatDialog);
  });

  afterEach(() => {
    dialog.closeAll();
  });

  it('opens standard ~560px dialog when not compact', () => {
    compact$.next(false);
    const ref = openEditDialog(dialog, SampleEditDialog, breakpoints, {
      data: { title: 'Editar registro' },
    });
    expect(ref.componentInstance.data.title).toBe('Editar registro');
    expect(document.querySelector('.app-edit-dialog--standard')).not.toBeNull();
    expect(document.querySelector('.app-edit-dialog--fullscreen')).toBeNull();

    const config = editDialogConfig(breakpoints);
    expect(config.width).toBe(EDIT_DIALOG_STANDARD_WIDTH);
  });

  it('opens fullscreen with sticky footer class when compact', () => {
    compact$.next(true);
    openEditDialog(dialog, SampleEditDialog, breakpoints, {
      data: { title: 'Editar registro' },
    });
    expect(
      document.querySelector('.app-edit-dialog--fullscreen'),
    ).not.toBeNull();
    const config = editDialogConfig(breakpoints);
    expect(config.width).toBe('100vw');
    expect(config.height).toBe('100dvh');
  });

  it('renders layout title and projected body/actions', async () => {
    // Isolated layout asserts dialogTitle binding (avoid native `title` collision).
    const layoutFixture = TestBed.createComponent(EditDialogLayout);
    layoutFixture.componentRef.setInput('dialogTitle', 'Editar registro');
    layoutFixture.detectChanges();
    expect(
      (layoutFixture.nativeElement as HTMLElement).textContent,
    ).toContain('Editar registro');
    layoutFixture.destroy();

    const ref = openEditDialog(dialog, SampleEditDialog, breakpoints, {
      data: { title: 'Editar registro' },
    });
    expect(document.body.textContent).toContain('Conteúdo do formulário');
    expect(document.body.textContent).toContain('Salvar');
    expect(ref.componentInstance.data.title).toBe('Editar registro');

    const closed = firstValueFrom(ref.afterClosed());
    ref.componentInstance.save();
    await expect(closed).resolves.toBe('saved');
  });
});
