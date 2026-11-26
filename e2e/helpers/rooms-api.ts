import { E2E_BFF_URL, E2E_CLASSES_URL, E2E_PREFIX } from './env';

/**
 * Massa de dados da UX-ROOMS, montada pela **BFF**, não pelo serviço de domínio.
 *
 * Usar a BFF aqui é intencional: é a mesma porta que a SPA enxerga (AD-6), então o que o teste
 * semeia e o que a tela lê passam pelo mesmo caminho. Se o proxy quebrar, o setup quebra junto e
 * o erro aparece cedo, em vez de virar uma tela vazia inexplicável.
 */

export interface RoomWrite {
  code: string;
  name: string;
  building: string;
  capacity: number | null;
  active: boolean;
  resourceIds: string[];
}

export interface RoomRead extends RoomWrite {
  id: string;
  enabled: boolean;
  classes?: unknown[];
}

export interface FeatureRead {
  id: string;
  code: string;
  description: string | null;
  present: boolean;
}

const ROOMS = `${E2E_BFF_URL}/api/v1/rooms`;
/**
 * Turmas são semeadas no serviço `classes` direto, não pela BFF: o módulo do Grupo 01 ainda não
 * está na main da BFF. A leitura que o teste verifica continua vindo da BFF, pela composição T3 —
 * que é o que importa provar aqui.
 */
const CLASSES = `${E2E_CLASSES_URL}/api/v1/classes`;

function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
}

async function ok<T>(res: Response, what: string): Promise<T> {
  if (!res.ok) {
    throw new Error(`${what} falhou: HTTP ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as T;
}

/** Corpo de sala com o prefixo que o purge reconhece. */
export function seedRoomBody(suffix: string): RoomWrite {
  return {
    code: `${E2E_PREFIX}${suffix}`,
    name: `${E2E_PREFIX}Sala ${suffix}`,
    building: '32',
    capacity: 42,
    active: true,
    resourceIds: [],
  };
}

export async function createRoom(token: string, body: RoomWrite): Promise<RoomRead> {
  return ok<RoomRead>(
    await fetch(ROOMS, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) }),
    'criar sala',
  );
}

export async function createFeature(
  token: string,
  roomId: string,
  code: string,
  description: string,
): Promise<FeatureRead> {
  return ok<FeatureRead>(
    await fetch(`${ROOMS}/${roomId}/accessibility-features`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ code, description, present: true }),
    }),
    'criar característica de acessibilidade',
  );
}

/**
 * Semestre em curso pela mesma regra da BFF (`composition.md`): fuso America/Sao_Paulo, segundo
 * semestre a partir de agosto. O teste precisa dela para semear uma turma que a composição T3
 * realmente devolva.
 */
export function currentSemester(now = new Date()): { year: number; semester: 1 | 2 } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  return { year, semester: month < 8 ? 1 : 2 };
}

/** Turma do semestre em curso sediada na sala — é o que faz a coluna Turmas semestre sair de zero. */
export async function createClassInRoom(
  token: string,
  roomId: string,
  code: string,
): Promise<{ id: string }> {
  const { year, semester } = currentSemester();
  const [start, end] = semester === 1 ? ['03-01', '07-15'] : ['08-01', '12-15'];
  return ok<{ id: string }>(
    await fetch(CLASSES, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        courseId: crypto.randomUUID(),
        roomId,
        professorId: crypto.randomUUID(),
        startDate: `${year}-${start}`,
        endDate: `${year}-${end}`,
        year,
        semester,
        seats: 40,
        studentIds: [],
        code: `${E2E_PREFIX}${code}`,
        label: `${E2E_PREFIX}Turma ${code}`,
        modality: 'PRESENCIAL',
        status: 'active',
      }),
    }),
    'criar turma',
  );
}

async function listRooms(token: string): Promise<RoomRead[]> {
  const res = await fetch(ROOMS, { headers: authHeaders(token) });
  // O rooms responde 404 quando o filtro não casa nada; para a varredura, é lista vazia.
  if (res.status === 404) {
    return [];
  }
  return ok<RoomRead[]>(res, 'listar salas');
}

async function listClasses(token: string): Promise<{ id: string; code?: string }[]> {
  const res = await fetch(CLASSES, { headers: authHeaders(token) });
  if (!res.ok) {
    return [];
  }
  const body: unknown = await res.json();
  return Array.isArray(body) ? (body as { id: string; code?: string }[]) : [];
}

/**
 * Apaga tudo que este teste cria, reconhecido pelo prefixo. Roda antes **e** depois: antes porque
 * uma execução anterior pode ter morrido no meio, depois para não deixar sujeira. É o que torna a
 * suíte repetível.
 */
export async function purgeE2eRooms(token: string): Promise<void> {
  for (const klass of await listClasses(token)) {
    if (klass.code?.startsWith(E2E_PREFIX)) {
      await fetch(`${CLASSES}/${klass.id}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      }).catch(() => undefined);
    }
  }
  for (const room of await listRooms(token)) {
    if (room.code?.startsWith(E2E_PREFIX) || room.name?.startsWith(E2E_PREFIX)) {
      await fetch(`${ROOMS}/${room.id}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      }).catch(() => undefined);
    }
  }
}
