import config from './config.js';

const keyName = 'fenix-auth';
let session = JSON.parse(localStorage.getItem(keyName) || 'null');
let renewing;

async function request(path, { method = 'GET', body, token, headers } = {}) {
  const response = await fetch(config.url + path, {
    method, headers: { apikey: config.key, 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!response.ok) {
    const error = new Error('Falha na solicitação.');
    error.status = response.status;
    throw error;
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function setSession(value) {
  session = value;
  if (value) localStorage.setItem(keyName, JSON.stringify(value));
  else localStorage.removeItem(keyName);
}

export const configured = Boolean(config.url);
export const currentUser = () => session?.user ?? null;

export async function login(email, password) {
  setSession(await request('/auth/v1/token?grant_type=password', { method: 'POST', body: {email, password} }));
}
export async function logout() {
  try {
    await request('/auth/v1/logout?scope=local', { method: 'POST', token: session?.access_token });
  } finally { setSession(null); }
}

async function token() {
  if (!session) throw new Error('Sessão encerrada.');
  if (session.expires_at > Date.now() / 1000 + 60) return session.access_token;
  renewing ??= request('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST', body: { refresh_token: session.refresh_token }
  }).then(setSession).catch(error => {
    if (error.status === 400 || error.status === 401) setSession(null);
    throw error;
  }).finally(() => { renewing = undefined; });
  await renewing;
  return session.access_token;
}
export async function records() {
  const accessToken = await token();
  const entries = [];
  for (let offset = 0; ; offset += 500) {
    const page = await request('/rest/v1/fenix_records?select=kind,entry,payload&order=kind.asc,entry.asc&limit=500&offset=' + offset, { token: accessToken });
    entries.push(...page);
    if (page.length < 500) return entries;
  }
}
export async function save(record) {
  const accessToken = await token();
  await request('/rest/v1/fenix_records?on_conflict=owner,kind,entry', {
    method: 'POST', token: accessToken, body: record,
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }
  });
}
