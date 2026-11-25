import { E2E_OAUTH_URL, E2E_PASSWORD, E2E_USERNAME } from './env';

export interface OauthTokens {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
}

/** `POST {oauth}/login` multipart — mesmo contrato da SPA. */
export async function loginOauth(
  username = E2E_USERNAME,
  password = E2E_PASSWORD,
): Promise<OauthTokens> {
  const body = new FormData();
  body.set('username', username);
  body.set('password', password);

  const res = await fetch(`${E2E_OAUTH_URL}/login`, {
    method: 'POST',
    body,
  });
  if (!res.ok) {
    throw new Error(`oauth login failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as OauthTokens;
}
