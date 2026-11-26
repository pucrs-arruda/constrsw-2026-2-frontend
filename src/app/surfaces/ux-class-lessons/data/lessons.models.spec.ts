import { HttpErrorResponse } from '@angular/common/http';
import { BffRequestError, mapBffHttpError } from '../../../shared/http';
import { displayLessonDate, lessonError, lessonPermissions, validLessonDate } from './lessons.models';

describe('Lessons: permissões, datas e recusas', () => {
  it('coordenador gerencia aulas; administrador e aluno não recebem permissão implícita', () => {
    expect(lessonPermissions({ sub: 'u', papeis: ['coordinator'] }, 'p')).toEqual({ manage: true, edit: true });
    expect(lessonPermissions({ sub: 'u', papeis: ['administrator'] }, 'p')).toEqual({ manage: false, edit: false });
    expect(lessonPermissions({ sub: 'u', papeis: ['student'] }, 'p').edit).toBe(false);
    expect(lessonPermissions(null, 'p').manage).toBe(false);
  });
  it('professor só edita sua turma; sub não substitui professorId', () => {
    expect(lessonPermissions({ sub: 'u', professorId: 'p', papeis: ['professor'] }, 'p')).toEqual({ manage: false, edit: true });
    expect(lessonPermissions({ sub: 'p', papeis: ['professor'] }, 'p').edit).toBe(false);
    expect(lessonPermissions({ sub: 'u', professorId: 'outro', papeis: ['professor'] }, 'p').edit).toBe(false);
  });
  it('valida período, dias inexistentes e domingo sem depender do fuso local', () => {
    expect(validLessonDate('2026-11-04', '2026-11-01', '2026-11-30')).toBe(true);
    expect(validLessonDate('2026-11-08', '2026-11-01', '2026-11-30')).toBe(false);
    expect(validLessonDate('2026-11-31', '2026-11-01', '2026-12-20')).toBe(false);
    expect(validLessonDate('2026-12-01', '2026-11-01', '2026-11-30')).toBe(false);
    expect(displayLessonDate('2026-11-04')).toBe('04/11/2026');
  });
  it('mostra a recusa LE-409 do domínio, inclusive quando encapsulada pelo cliente BFF', () => {
    const http = new HttpErrorResponse({ status: 409, error: { error_code: 'LE-409', error_description: 'A turma já teve aulas geradas.' } });
    const error = new BffRequestError(mapBffHttpError(http), http);
    expect(lessonError(error)).toEqual({ kind: 'refusal', message: 'A turma já teve aulas geradas.' });
  });
  it('distingue indisponibilidade e expiração da sessão', () => {
    expect(lessonError(new HttpErrorResponse({ status: 503 })).kind).toBe('composition');
    expect(lessonError(new HttpErrorResponse({ status: 401 })).message).toContain('sessão expirou');
  });
});
