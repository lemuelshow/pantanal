import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
const { criarApp } = await import('../src/app.js');
const R = await import('../src/regras.js');

let servidor;
let base;

before(async () => {
  servidor = criarApp().listen(0);
  await new Promise((ok) => servidor.once('listening', ok));
  base = `http://localhost:${servidor.address().port}/api`;
});

after(() => servidor.close());

async function chamar(metodo, caminho, corpo) {
  const res = await fetch(base + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined
  });
  const txt = await res.text();
  return { status: res.status, corpo: txt ? (res.headers.get('content-type')?.includes('json') ? JSON.parse(txt) : txt) : null };
}

test('resumo calcula resultado, km rodado, consumo e custo por km', () => {
  const r = R.resumo([
    { tipo: 'entrada', categoria: 'frete', valor: 10000, km: 1000 },
    { tipo: 'saida', categoria: 'combustivel', valor: 3000, km: 1500, litros: 200 },
    { tipo: 'saida', categoria: 'pedagio', valor: 500 }
  ]);
  assert.equal(r.resultado, 6500);
  assert.equal(r.km, 500);
  assert.equal(r.kmPorLitro, 2.5);
  assert.equal(r.custoPorKm, 7);
});

test('vencimentos classifica vencido, próximo e em dia', () => {
  const itens = R.vencimentos([{ id: 'v', placa: 'AAA1A11', ativo: true, crlvVenc: '2026-01-01', seguroVenc: '2026-01-20', anttVenc: '2026-06-01' }], [], '2026-01-10');
  assert.deepEqual(itens.map((i) => i.situacao), ['vencido', 'proximo', 'ok']);
});

test('placa é normalizada e validada', async () => {
  const ruim = await chamar('POST', '/veiculos', { placa: 'AB-12' });
  assert.equal(ruim.status, 400);
  const ok = await chamar('POST', '/veiculos', { placa: 'qab-1c23', tipo: 'Truck' });
  assert.equal(ok.status, 201);
  assert.equal(ok.corpo.placa, 'QAB1C23');
  const dup = await chamar('POST', '/veiculos', { placa: 'QAB1C23' });
  assert.equal(dup.status, 409);
});

test('frete gera comissão, atualiza hodômetro e entra no relatório do veículo', async () => {
  const mot = (await chamar('POST', '/motoristas', { nome: 'Teste', comissaoPct: 10 })).corpo;
  const vei = (await chamar('POST', '/veiculos', { placa: 'REX4F56', motoristaId: mot.id, kmAtual: 1000 })).corpo;
  const mes = R.mesAtual();
  const criados = await chamar('POST', '/lancamentos', { data: `${mes}-05`, tipo: 'entrada', categoria: 'frete', veiculoId: vei.id, motoristaId: mot.id, valor: 8000, km: 1200, gerarComissao: true });
  assert.equal(criados.status, 201);
  assert.equal(criados.corpo.length, 2);
  assert.equal(criados.corpo[1].categoria, 'comissao');
  assert.equal(criados.corpo[1].valor, 800);
  await chamar('POST', '/lancamentos', { data: `${mes}-06`, tipo: 'saida', categoria: 'combustivel', veiculoId: vei.id, valor: 1500, km: 1700, litros: 250 });

  const veiculos = (await chamar('GET', '/veiculos')).corpo;
  assert.equal(veiculos.find((v) => v.id === vei.id).kmAtual, 1700);

  const rel = (await chamar('GET', `/relatorio?mes=${mes}&veiculoId=${vei.id}`)).corpo;
  assert.equal(rel.resumo.entradas, 8000);
  assert.equal(rel.resumo.saidas, 2300);
  assert.equal(rel.resumo.km, 500);
  assert.equal(rel.lancamentos.at(-1).saldo, 5700);

  const del = await chamar('DELETE', `/veiculos/${vei.id}`);
  assert.equal(del.status, 409);
});

test('lançamento com categoria incompatível com o tipo é recusado', async () => {
  const r = await chamar('POST', '/lancamentos', { data: '2026-01-01', tipo: 'entrada', categoria: 'combustivel', valor: 10 });
  assert.equal(r.status, 400);
});

test('renovar documento atualiza a validade e lança a despesa', async () => {
  const vei = (await chamar('POST', '/veiculos', { placa: 'NRT7G89', crlvVenc: '2020-01-01' })).corpo;
  const r = await chamar('POST', '/vencimentos/renovar', { alvo: 'veiculos', id: vei.id, campo: 'crlvVenc', novaData: '2030-01-01', valor: 350 });
  assert.equal(r.status, 200);
  assert.equal(r.corpo.atualizado.crlvVenc, '2030-01-01');
  assert.equal(r.corpo.lancamento.categoria, 'licenciamento');
});

test('CSV de lançamentos sai com cabeçalho em português', async () => {
  const r = await chamar('GET', '/lancamentos.csv');
  assert.equal(r.status, 200);
  assert.match(r.corpo, /Data;Placa;Entrada\/Saída/);
});
