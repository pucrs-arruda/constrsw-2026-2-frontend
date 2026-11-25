export const environment = {
  production: true,
  /** Same-origin oauth proxy (nginx / ng serve). */
  oauthBaseUrl: '/oauth',
  /** Same-origin BFF proxy; Bearer attached only to this base. */
  bffBaseUrl: '/api',
};
