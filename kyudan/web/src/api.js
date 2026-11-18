// Cliente HTTP da API. O token fica em memoria e no sessionStorage.
let token = null;
try { token = sessionStorage.getItem('kyudan_token'); } catch { /* sem storage */ }
let aoExpirar = () => {};

export const temToken = () => !!token;
export const definirAoExpirar = (fn) => { aoExpirar = fn; };
export function definirToken(t) {
  token = t;
  try { t ? sessionStorage.setItem('kyudan_token', t) : sessionStorage.removeItem('kyudan_token'); } catch { /* sem storage */ }
}

export async function api(path, { method = 'GET', body, query } = {}) {
  const qs = query
    ? '?' + new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== '')).toString()
    : '';
  const res = await fetch(`/api${path}${qs}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const sessaoPerdida = res.status === 401 || data.error === 'Seu acesso foi revogado.';
    if (sessaoPerdida && path !== '/auth/login') aoExpirar(data.error);
    const erro = new Error(data.error || 'Não foi possível concluir a operação.');
    erro.dados = data; // ex.: { requer_confirmacao: true }
    throw erro;
  }
  return data;
}
