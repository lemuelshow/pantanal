async function requisitar(metodo, caminho, corpo) {
  let res;
  try {
    res = await fetch(`/api${caminho}`, {
      method: metodo,
      headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
      body: corpo ? JSON.stringify(corpo) : undefined
    });
  } catch {
    throw new Error('Não foi possível falar com o servidor. Verifique se a API está rodando.');
  }
  if (res.status === 204) return null;
  const dados = await res.json().catch(() => null);
  if (!res.ok) throw new Error(dados?.erro || `Erro ${res.status} ao processar a solicitação.`);
  return dados;
}

export const api = {
  get: (c) => requisitar('GET', c),
  post: (c, b) => requisitar('POST', c, b),
  put: (c, b) => requisitar('PUT', c, b),
  del: (c) => requisitar('DELETE', c)
};

export function query(params) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null));
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function baixar(caminho) {
  const a = document.createElement('a');
  a.href = `/api${caminho}`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
