import { E2E_BFF_URL, E2E_PREFIX } from './env';

export interface ResourceSeed {
  code: string;
  name: string;
  type: string;
  active?: boolean;
  tags?: string[];
}

export interface ResourceSeeded {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

/** Seeds through the BFF, the same path the UI uses. */
export async function createResource(
  token: string,
  body: ResourceSeed,
): Promise<ResourceSeeded> {
  const res = await fetch(`${E2E_BFF_URL}/api/v1/resources`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`create resource: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as ResourceSeeded;
}

/** Soft-deletes every `E2E-` resource through the BFF (DELETE sets enabled=false). */
export async function purgeE2eResources(token: string): Promise<void> {
  const res = await fetch(`${E2E_BFF_URL}/api/v1/resources`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(`list resources: ${res.status} ${await res.text()}`);
  }
  const list = (await res.json()) as ResourceSeeded[];
  for (const resource of list) {
    if (!resource.code.startsWith(E2E_PREFIX)) {
      continue;
    }
    const del = await fetch(
      `${E2E_BFF_URL}/api/v1/resources/${resource.id}`,
      { method: 'DELETE', headers: authHeaders(token) },
    );
    if (!del.ok && del.status !== 404) {
      throw new Error(`delete resource ${resource.code}: ${del.status}`);
    }
  }
}
