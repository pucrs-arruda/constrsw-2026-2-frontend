import { BreakpointObserver } from '@angular/cdk/layout';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { RoomsAccess } from '../data/rooms-access.service';
import { RoomsApiService } from '../data/rooms-api.service';
import { RoomView } from '../data/rooms.models';
import { RoomsListPage } from './rooms-list.page';

const room: RoomView = {
  id: '1', code: 'A-101', name: 'Sala de aula', building: 'Prédio A',
  capacity: null, active: true, enabled: true, resourceIds: [], classes: [],
};

describe('RoomsListPage', () => {
  const list = vi.fn();
  const remove = vi.fn();
  const open = vi.fn();
  const isAdmin = signal(true);
  let viewport: number;
  let harness: RouterTestingHarness;

  beforeEach(() => {
    vi.resetAllMocks();
    isAdmin.set(true);
    viewport = 1280;
    list.mockReturnValue(of({ items: [room], total: 1 }));
    remove.mockReturnValue(of(undefined));
    open.mockReturnValue({ afterClosed: () => of(true) });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'salas', component: RoomsListPage }]),
        { provide: RoomsAccess, useValue: { canWrite: isAdmin, seesAllClasses: isAdmin } },
        { provide: RoomsApiService, useValue: { list, remove } },
        { provide: MatDialog, useValue: { open } },
        { provide: BreakpointObserver, useValue: {
          observe: () => of({ breakpoints: {
            '(max-width: 599px)': viewport < 600,
            '(min-width: 1280px)': viewport >= 1280,
          } }),
        } },
      ],
    });
  });

  async function navigate(url = '/salas') {
    harness ??= await RouterTestingHarness.create();
    return harness.navigateByUrl(url, RoomsListPage);
  }

  afterEach(() => { harness = undefined!; });

  it.each([
    [360, false, false], [768, true, false], [1280, true, true],
  ])('renderiza o total e as salas no layout de %ipx', async (width, table, complete) => {
    viewport = width;
    await navigate();
    const screen = harness.routeNativeElement!;
    expect(screen.textContent).toContain('1 sala');
    expect(screen.textContent).toContain('A-101');
    expect(screen.textContent).toContain('Capacidade não informada');
    expect(!!screen.querySelector('table')).toBe(table);
    expect(!!screen.querySelector('.mat-column-name')).toBe(complete);
  });

  it('esconde as ações de escrita para quem não é administrador', async () => {
    isAdmin.set(false);
    await navigate();
    const screen = harness.routeNativeElement!;
    expect(screen.textContent).toContain('Você vê apenas as turmas vinculadas a você.');
    expect(screen.textContent).toContain('Abrir');
    for (const action of ['Nova sala', 'Editar', 'Excluir']) {
      expect(screen.textContent).not.toContain(action);
    }
  });

  it('aplica a URL na consulta e atualiza a URL após a busca', async () => {
    const page = await navigate('/salas?q=Lab&campo=name&predio=P&capMin=20&ativa=false&page=2&size=10&sort=capacity,desc');
    expect(list).toHaveBeenLastCalledWith({
      filters: [
        { field: 'name', op: 'like', value: '%Lab%' },
        { field: 'building', op: 'like', value: '%P%' },
        { field: 'capacity', op: 'gteq', value: 20 },
        { field: 'active', op: 'eq', value: false },
      ],
      page: 2, size: 10, sort: { field: 'capacity', dir: 'desc' },
    });
    page.filters.controls.q.setValue('Auditório');
    const router = TestBed.inject(Router);
    await vi.waitFor(() => {
      const params = router.parseUrl(router.url).queryParamMap;
      expect(params.get('q')).toBe('Auditório');
      expect(params.has('page')).toBe(false);
      expect(list.mock.lastCall?.[0].filters[0].value).toBe('%Auditório%');
    });
  });

  it('mostra o estado vazio com filtros quando recebe 404', async () => {
    list.mockReturnValue(throwError(() => ({ kind: 'not-found', status: 404 })));
    await navigate('/salas?q=indisponivel');
    expect(harness.routeNativeElement!.textContent).toContain('Nenhuma sala encontrada com esses filtros.');
  });

  it('tenta novamente após uma falha de composição', async () => {
    list.mockReturnValueOnce(throwError(() => ({ kind: 'composition-unavailable', status: 503 })));
    await navigate();
    const screen = harness.routeNativeElement!;
    expect(screen.textContent).toContain('Serviço de composição indisponível.');
    const retry = Array.from(screen.querySelectorAll('button')).find(button => button.textContent?.includes('Tentar novamente'));
    retry!.click();
    harness.detectChanges();
    expect(list).toHaveBeenCalledTimes(2);
    expect(screen.textContent).toContain('A-101');
  });

  it('exclui somente após confirmar e recarrega as salas', async () => {
    const page = await navigate();
    open.mockReturnValueOnce({ afterClosed: () => of(false) });
    page.confirmRemove(room);
    expect(remove).not.toHaveBeenCalled();
    page.confirmRemove(room);
    expect(remove).toHaveBeenCalledWith(room.id);
    expect(list).toHaveBeenCalledTimes(2);
  });
});
