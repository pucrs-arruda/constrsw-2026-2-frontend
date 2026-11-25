import { Location } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../../auth/auth.service';
import { RoomsApiService } from '../data/rooms-api.service';
import type { AccessibilityFeature, ClassSummary, RoomView } from '../data/rooms.models';
import { RoomDetailPage } from './room-detail.page';

const roomId = '6d54f72b-0153-4e51-a128-f59b71c2faa3';
const feature: AccessibilityFeature = {
  id: 'ramp',
  roomId,
  code: 'RAMP',
  description: 'Rampa lateral',
  present: true,
  enabled: true,
};
const classSummary: ClassSummary & { studentIds: string[] } = {
  id: 'turma',
  code: 'T01',
  label: 'Turma da manhã',
  status: 'active',
  modality: 'Presencial',
  startDate: '2026-08-01',
  endDate: '2026-12-01',
  year: 2026,
  semester: 2,
  seats: 40,
  courseId: 'curso',
  professorId: null,
  roomId,
  enabled: true,
  studentIds: ['id-de-aluno-privado'],
};
const room: RoomView = {
  id: roomId,
  code: 'B201',
  name: 'Laboratório',
  building: 'Prédio B',
  capacity: null,
  active: true,
  enabled: true,
  resourceIds: [],
  classes: [classSummary],
};

describe('RoomDetailPage', () => {
  let fixture: ComponentFixture<RoomDetailPage>;
  let host: HTMLElement;
  const isAdmin = signal(true);
  const paramMap = new Subject<ReturnType<typeof convertToParamMap>>();
  const api = { get: vi.fn(), listFeatures: vi.fn(), patchFeature: vi.fn(), remove: vi.fn() };
  const dialog = { open: vi.fn() };
  const snackbar = { open: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    isAdmin.set(true);
    api.get.mockReturnValue(of(room));
    api.listFeatures.mockReturnValue(of({ items: [feature], total: 1 }));
    await TestBed.configureTestingModule({
      imports: [RoomDetailPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap, snapshot: { queryParams: {}, fragment: null } },
        },
        { provide: RoomsApiService, useValue: api },
        { provide: AuthService, useValue: { isAdmin, seesAllClasses: isAdmin } },

        { provide: MatSnackBar, useValue: snackbar },
      ],
    })
      .overrideProvider(MatDialog, { useValue: dialog })
      .compileComponents();
    fixture = TestBed.createComponent(RoomDetailPage);
    host = fixture.nativeElement;
  });

  function openRoom(id = roomId): void {
    fixture.detectChanges();
    paramMap.next(convertToParamMap({ id }));
    fixture.detectChanges();
  }

  it('carrega a sala e os recursos e mostra as turmas sem dados de alunos', async () => {
    openRoom();
    await fixture.whenStable();
    expect(api.get).toHaveBeenCalledWith(roomId);
    expect(api.listFeatures).toHaveBeenCalledWith(roomId, { page: 0, size: 20 });
    expect(host.textContent).toContain('Laboratório');
    expect(host.textContent).toContain('Capacidade não informada');
    expect(host.textContent).toContain('RAMP');
    expect(host.textContent).toContain('Turma da manhã');
    expect(host.textContent).toContain('01/08/2026');
    expect(host.textContent).not.toContain('id-de-aluno-privado');
    expect(host.textContent).not.toMatch(/alunos|studentIds/i);
    expect(document.activeElement).toBe(host.querySelector('h1'));
  });

  it('recusa UUID inválido antes de chamar a API', () => {
    openRoom('invalido');
    expect(host.textContent).toContain('Sala não encontrada.');
    expect(api.get).not.toHaveBeenCalled();
    expect(api.listFeatures).not.toHaveBeenCalled();
  });

  it('apresenta estado de sala não encontrada para 404', () => {
    api.get.mockReturnValue(throwError(() => ({ kind: 'not-found', status: 404 })));
    openRoom();
    expect(host.textContent).toContain('Sala não encontrada.');
    expect(host.textContent).toContain('Voltar para Salas de Aula');
  });

  it('oculta os dados parciais na falha de composição e repete a carga', () => {
    api.get.mockReturnValueOnce(
      throwError(() => ({ kind: 'composition-unavailable', status: 503 })),
    );
    openRoom();
    expect(host.textContent).toContain('Não foi possível obter as turmas');
    expect(host.textContent).not.toContain('RAMP');
    host.querySelector<HTMLButtonElement>('.btn-retry')!.click();
    fixture.detectChanges();
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(host.textContent).toContain('RAMP');
  });

  it('repete só os recursos quando o painel de acessibilidade falha', () => {
    api.listFeatures.mockReturnValueOnce(
      throwError(() => ({ kind: 'network', message: 'Falha de rede.' })),
    );
    openRoom();
    expect(host.textContent).toContain('Laboratório');
    expect(host.textContent).toContain('Falha de rede.');
    host.querySelector<HTMLButtonElement>('.btn-retry')!.click();
    fixture.detectChanges();
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain('RAMP');
  });

  it('mostra o estado vazio de turmas e oculta ações administrativas', () => {
    isAdmin.set(false);
    api.get.mockReturnValue(of({ ...room, classes: [] }));
    openRoom();
    expect(host.textContent).toContain('Nenhuma turma sediada nesta sala');
    expect(host.textContent).toContain('Você vê apenas as turmas vinculadas a você.');
    expect(host.textContent).not.toMatch(/Editar sala|Excluir sala|Adicionar recurso/);
    expect(host.querySelector('mat-slide-toggle')).toBeNull();
    expect(host.querySelector('[aria-label^="Mais ações"]')).toBeNull();
  });

  it('reverte a presença otimista quando a API recusa a mudança', () => {
    const patch = new Subject<AccessibilityFeature>();
    api.patchFeature.mockReturnValue(patch);
    openRoom();
    host.querySelector<HTMLButtonElement>('mat-slide-toggle button')!.click();
    fixture.detectChanges();
    expect(api.patchFeature).toHaveBeenCalledWith(roomId, feature.id, { present: false });
    expect(host.textContent).toContain('Ausente');
    patch.error({ kind: 'conflict', message: 'Não foi possível alterar.' });
    fixture.detectChanges();
    expect(host.textContent).toContain('Presente');
    expect(snackbar.open).toHaveBeenCalledWith(
      'Não foi possível alterar.',
      'Fechar',
      expect.anything(),
    );
  });

  it('volta à lista após confirmar e excluir a sala', () => {
    dialog.open.mockReturnValue({ afterClosed: () => of(true) });
    api.remove.mockReturnValue(of(undefined));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Location), 'getState').mockReturnValue({ queryParams: { q: 'B201' } });
    openRoom();
    const button = Array.from(host.querySelectorAll('button')).find(
      (item) => item.textContent?.trim() === 'Excluir sala',
    );
    button!.click();
    expect(api.remove).toHaveBeenCalledWith(roomId);
    expect(navigate).toHaveBeenCalledWith(['/salas'], { queryParams: { q: 'B201' } });
  });
});
