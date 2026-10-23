import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const caminho = process.env.DB_PATH || resolve(raiz, 'data', 'pantanal.db');

if (caminho !== ':memory:') mkdirSync(dirname(caminho), { recursive: true });

export const db = new DatabaseSync(caminho);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS motoristas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cpf TEXT,
  telefone TEXT,
  comissaoPct REAL NOT NULL DEFAULT 0,
  cnhNumero TEXT,
  cnhCategoria TEXT,
  cnhVenc TEXT,
  toxicoVenc TEXT,
  asoVenc TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  criadoEm TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS veiculos (
  id TEXT PRIMARY KEY,
  placa TEXT NOT NULL UNIQUE,
  tipo TEXT,
  ano TEXT,
  marca TEXT,
  modelo TEXT,
  renavam TEXT,
  kmAtual INTEGER,
  motoristaId TEXT REFERENCES motoristas(id) ON DELETE SET NULL,
  ativo INTEGER NOT NULL DEFAULT 1,
  crlvVenc TEXT,
  anttVenc TEXT,
  tacografoVenc TEXT,
  seguradora TEXT,
  apolice TEXT,
  seguroVenc TEXT,
  obs TEXT,
  criadoEm TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lancamentos (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  categoria TEXT NOT NULL,
  veiculoId TEXT REFERENCES veiculos(id) ON DELETE RESTRICT,
  motoristaId TEXT REFERENCES motoristas(id) ON DELETE RESTRICT,
  valor REAL NOT NULL CHECK (valor > 0),
  km INTEGER,
  descricao TEXT,
  documento TEXT,
  litros REAL,
  pontos INTEGER,
  statusMulta TEXT,
  criadoEm TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_lanc_data ON lancamentos (data);
CREATE INDEX IF NOT EXISTS ix_lanc_veiculo ON lancamentos (veiculoId, data);
`);

const COLUNAS = {
  motoristas: ['nome', 'cpf', 'telefone', 'comissaoPct', 'cnhNumero', 'cnhCategoria', 'cnhVenc', 'toxicoVenc', 'asoVenc', 'ativo'],
  veiculos: ['placa', 'tipo', 'ano', 'marca', 'modelo', 'renavam', 'kmAtual', 'motoristaId', 'ativo', 'crlvVenc', 'anttVenc', 'tacografoVenc', 'seguradora', 'apolice', 'seguroVenc', 'obs'],
  lancamentos: ['data', 'tipo', 'categoria', 'veiculoId', 'motoristaId', 'valor', 'km', 'descricao', 'documento', 'litros', 'pontos', 'statusMulta']
};

function deBanco(tabela, linha) {
  if (!linha) return null;
  const r = { ...linha };
  if ('ativo' in r) r.ativo = r.ativo === 1;
  return r;
}

function paraBanco(campo, valor) {
  if (campo === 'ativo') return valor === false || valor === 0 ? 0 : 1;
  if (valor === undefined || valor === '') return null;
  return valor;
}

export function listar(tabela, ordem = 'criadoEm') {
  return db.prepare(`SELECT * FROM ${tabela} ORDER BY ${ordem}`).all().map((l) => deBanco(tabela, l));
}

export function obter(tabela, id) {
  return deBanco(tabela, db.prepare(`SELECT * FROM ${tabela} WHERE id = ?`).get(id));
}

export function inserir(tabela, dados) {
  const id = dados.id || randomUUID();
  const cols = COLUNAS[tabela];
  const valores = cols.map((c) => paraBanco(c, dados[c]));
  db.prepare(`INSERT INTO ${tabela} (id, ${cols.join(', ')}, criadoEm) VALUES (?, ${cols.map(() => '?').join(', ')}, ?)`)
    .run(id, ...valores, dados.criadoEm || new Date().toISOString());
  return obter(tabela, id);
}

export function atualizar(tabela, id, dados) {
  const cols = COLUNAS[tabela].filter((c) => c in dados);
  if (!cols.length) return obter(tabela, id);
  db.prepare(`UPDATE ${tabela} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`)
    .run(...cols.map((c) => paraBanco(c, dados[c])), id);
  return obter(tabela, id);
}

export function remover(tabela, id) {
  return db.prepare(`DELETE FROM ${tabela} WHERE id = ?`).run(id).changes > 0;
}

export function transacao(fn) {
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export function contarLancamentos(campo, id) {
  return db.prepare(`SELECT COUNT(*) AS n FROM lancamentos WHERE ${campo} = ?`).get(id).n;
}

export function buscarLancamentos({ mes, veiculoId, tipo, categoria, statusMulta, q } = {}) {
  const where = [];
  const args = [];
  if (mes) { where.push('substr(l.data, 1, 7) = ?'); args.push(mes); }
  if (veiculoId) { where.push('l.veiculoId = ?'); args.push(veiculoId); }
  if (tipo) { where.push('l.tipo = ?'); args.push(tipo); }
  if (categoria) { where.push('l.categoria = ?'); args.push(categoria); }
  if (statusMulta) { where.push("COALESCE(l.statusMulta, 'Em aberto') = ?"); args.push(statusMulta); }
  if (q) {
    where.push(`(lower(COALESCE(l.descricao,'')) LIKE ? OR lower(COALESCE(l.documento,'')) LIKE ?
      OR lower(COALESCE(v.placa,'')) LIKE ? OR lower(COALESCE(m.nome,'')) LIKE ?)`);
    const t = `%${String(q).toLowerCase()}%`;
    args.push(t, t, t, t);
  }
  const sql = `SELECT l.* FROM lancamentos l
    LEFT JOIN veiculos v ON v.id = l.veiculoId
    LEFT JOIN motoristas m ON m.id = l.motoristaId
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY l.data DESC, l.criadoEm DESC`;
  return db.prepare(sql).all(...args);
}
