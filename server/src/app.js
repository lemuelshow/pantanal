import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as repo from './db.js';
import * as R from './regras.js';

class ErroValidacao extends Error {
  constructor(mensagem, status = 400) {
    super(mensagem);
    this.status = status;
  }
}

const texto = (v) => (v == null ? '' : String(v).trim());
const numero = (v) => (v === '' || v == null ? null : Number(v));
const dataISO = (v, campo, obrigatorio = false) => {
  if (!v) {
    if (obrigatorio) throw new ErroValidacao(`Informe ${campo}.`);
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) throw new ErroValidacao(`${campo} inválida: use o formato AAAA-MM-DD.`);
  return v;
};
const mesParam = (v) => {
  if (!v) return R.mesAtual();
  if (!/^\d{4}-\d{2}$/.test(v)) throw new ErroValidacao('Mês inválido: use o formato AAAA-MM.');
  return v;
};

function validarVeiculo(b, idAtual) {
  const placa = R.normalizarPlaca(b.placa);
  if (!R.placaValida(placa)) throw new ErroValidacao('Placa inválida: use 7 caracteres, como ABC1D23 ou ABC1234.');
  const outro = repo.listar('veiculos').find((v) => v.placa === placa && v.id !== idAtual);
  if (outro) throw new ErroValidacao(`Já existe um veículo com a placa ${placa}.`, 409);
  if (b.motoristaId && !repo.obter('motoristas', b.motoristaId)) throw new ErroValidacao('Motorista não encontrado.');
  return {
    placa,
    tipo: texto(b.tipo) || 'Outro',
    ano: texto(b.ano),
    marca: texto(b.marca),
    modelo: texto(b.modelo),
    renavam: texto(b.renavam),
    kmAtual: numero(b.kmAtual) != null ? Math.round(numero(b.kmAtual)) : null,
    motoristaId: b.motoristaId || null,
    ativo: b.ativo !== false,
    crlvVenc: dataISO(b.crlvVenc, 'A data do CRLV'),
    anttVenc: dataISO(b.anttVenc, 'A data da ANTT'),
    tacografoVenc: dataISO(b.tacografoVenc, 'A data do tacógrafo'),
    seguradora: texto(b.seguradora),
    apolice: texto(b.apolice),
    seguroVenc: dataISO(b.seguroVenc, 'A data do seguro'),
    obs: texto(b.obs)
  };
}

function validarMotorista(b) {
  const nome = texto(b.nome);
  if (!nome) throw new ErroValidacao('Informe o nome do motorista.');
  const pct = numero(b.comissaoPct) ?? 0;
  if (pct < 0 || pct > 100) throw new ErroValidacao('A comissão deve ficar entre 0% e 100%.');
  return {
    nome,
    cpf: texto(b.cpf),
    telefone: texto(b.telefone),
    comissaoPct: pct,
    cnhNumero: texto(b.cnhNumero),
    cnhCategoria: texto(b.cnhCategoria),
    cnhVenc: dataISO(b.cnhVenc, 'A validade da CNH'),
    toxicoVenc: dataISO(b.toxicoVenc, 'A validade do toxicológico'),
    asoVenc: dataISO(b.asoVenc, 'A validade do ASO'),
    ativo: b.ativo !== false
  };
}

function validarLancamento(b) {
  const tipo = b.tipo === 'entrada' ? 'entrada' : b.tipo === 'saida' ? 'saida' : null;
  if (!tipo) throw new ErroValidacao('Informe se o lançamento é entrada ou saída.');
  if (!R.categoriaValida(tipo, b.categoria)) throw new ErroValidacao('Tipo de lançamento inválido para ' + (tipo === 'entrada' ? 'entrada.' : 'saída.'));
  const valor = numero(b.valor);
  if (!(valor > 0)) throw new ErroValidacao('Informe um valor maior que zero.');
  if (b.veiculoId && !repo.obter('veiculos', b.veiculoId)) throw new ErroValidacao('Veículo não encontrado.');
  if (b.motoristaId && !repo.obter('motoristas', b.motoristaId)) throw new ErroValidacao('Motorista não encontrado.');
  const multa = b.categoria === 'multa';
  if (multa && b.statusMulta && !R.STATUS_MULTA.includes(b.statusMulta)) throw new ErroValidacao('Situação da multa inválida.');
  return {
    data: dataISO(b.data, 'a data', true),
    tipo,
    categoria: b.categoria,
    veiculoId: b.veiculoId || null,
    motoristaId: b.motoristaId || null,
    valor: Math.round(valor * 100) / 100,
    km: numero(b.km) ? Math.round(numero(b.km)) : null,
    descricao: texto(b.descricao),
    documento: texto(b.documento),
    litros: b.categoria === 'combustivel' && numero(b.litros) ? numero(b.litros) : null,
    pontos: multa && numero(b.pontos) ? Math.round(numero(b.pontos)) : null,
    statusMulta: multa ? b.statusMulta || 'Em aberto' : null
  };
}

function atualizarHodometro(veiculoId, km) {
  if (!veiculoId || !km) return;
  const v = repo.obter('veiculos', veiculoId);
  if (v && km > Number(v.kmAtual || 0)) repo.atualizar('veiculos', veiculoId, { kmAtual: km });
}

function csv(linhas) {
  const cel = (c) => {
    const s = c == null ? '' : String(c);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + linhas.map((l) => l.map(cel).join(';')).join('\r\n');
}
const br = (v) => (Number(v) || 0).toFixed(2).replace('.', ',');
const dataBR = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');

function enviarCsv(res, nome, linhas) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
  res.send(csv(linhas));
}

function relatorioFrota(mes) {
  const lancs = repo.buscarLancamentos({ mes });
  const veiculos = repo.listar('veiculos', 'placa');
  return {
    mes,
    total: R.resumo(lancs),
    semVeiculo: lancs.filter((l) => !l.veiculoId).length,
    veiculos: veiculos.map((v) => ({ veiculo: v, resumo: R.resumo(lancs.filter((l) => l.veiculoId === v.id)) }))
  };
}

function relatorioVeiculo(mes, veiculoId) {
  const veiculo = repo.obter('veiculos', veiculoId);
  if (!veiculo) throw new ErroValidacao('Veículo não encontrado.', 404);
  const lancs = repo.buscarLancamentos({ mes, veiculoId }).sort((a, b) => a.data.localeCompare(b.data) || a.criadoEm.localeCompare(b.criadoEm));
  const anterior = R.resumo(repo.buscarLancamentos({ mes: R.deslocarMes(mes, -1), veiculoId }));
  let saldo = 0;
  return {
    mes,
    veiculo,
    motorista: veiculo.motoristaId ? repo.obter('motoristas', veiculo.motoristaId) : null,
    resumo: R.resumo(lancs),
    anterior,
    saidasPorCategoria: R.porCategoria(lancs, 'saida'),
    entradasPorCategoria: R.porCategoria(lancs, 'entrada'),
    lancamentos: lancs.map((l) => {
      saldo += l.tipo === 'entrada' ? l.valor : -l.valor;
      return { ...l, saldo };
    })
  };
}

export function criarApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  const api = express.Router();

  api.get('/meta', (_req, res) => {
    res.json({
      categoriasSaida: R.CAT_SAIDA,
      categoriasEntrada: R.CAT_ENTRADA,
      tiposVeiculo: R.TIPOS_VEICULO,
      statusMulta: R.STATUS_MULTA,
      categoriasCnh: R.CATEGORIAS_CNH,
      docsVeiculo: R.DOCS_VEICULO,
      docsMotorista: R.DOCS_MOTORISTA,
      diasAlerta: R.DIAS_ALERTA,
      hoje: R.hojeISO()
    });
  });

  // Veículos
  api.get('/veiculos', (_req, res) => res.json(repo.listar('veiculos', 'placa')));
  api.post('/veiculos', (req, res) => res.status(201).json(repo.inserir('veiculos', validarVeiculo(req.body))));
  api.put('/veiculos/:id', (req, res) => {
    if (!repo.obter('veiculos', req.params.id)) throw new ErroValidacao('Veículo não encontrado.', 404);
    res.json(repo.atualizar('veiculos', req.params.id, validarVeiculo(req.body, req.params.id)));
  });
  api.delete('/veiculos/:id', (req, res) => {
    const n = repo.contarLancamentos('veiculoId', req.params.id);
    if (n) throw new ErroValidacao(`Este veículo tem ${n} lançamentos. Marque-o como inativo em vez de excluir.`, 409);
    if (!repo.remover('veiculos', req.params.id)) throw new ErroValidacao('Veículo não encontrado.', 404);
    res.status(204).end();
  });

  // Motoristas
  api.get('/motoristas', (_req, res) => res.json(repo.listar('motoristas', 'nome')));
  api.post('/motoristas', (req, res) => res.status(201).json(repo.inserir('motoristas', validarMotorista(req.body))));
  api.put('/motoristas/:id', (req, res) => {
    if (!repo.obter('motoristas', req.params.id)) throw new ErroValidacao('Motorista não encontrado.', 404);
    res.json(repo.atualizar('motoristas', req.params.id, validarMotorista(req.body)));
  });
  api.delete('/motoristas/:id', (req, res) => {
    const n = repo.contarLancamentos('motoristaId', req.params.id);
    if (n) throw new ErroValidacao(`Este motorista tem ${n} lançamentos. Marque-o como desligado em vez de excluir.`, 409);
    if (!repo.remover('motoristas', req.params.id)) throw new ErroValidacao('Motorista não encontrado.', 404);
    res.status(204).end();
  });

  // Lançamentos
  const filtros = (q) => ({ mes: q.mes || '', veiculoId: q.veiculoId || '', tipo: q.tipo || '', categoria: q.categoria || '', statusMulta: q.statusMulta || '', q: q.q || '' });
  api.get('/lancamentos', (req, res) => {
    const lista = repo.buscarLancamentos(filtros(req.query));
    res.json({ lancamentos: lista, resumo: R.resumo(lista) });
  });
  api.post('/lancamentos', (req, res) => {
    const dados = validarLancamento(req.body);
    const criados = repo.transacao(() => {
      const principal = repo.inserir('lancamentos', dados);
      const out = [principal];
      atualizarHodometro(dados.veiculoId, dados.km);
      const mot = dados.motoristaId && repo.obter('motoristas', dados.motoristaId);
      if (req.body.gerarComissao && dados.categoria === 'frete' && mot && mot.comissaoPct > 0) {
        out.push(repo.inserir('lancamentos', {
          data: dados.data, tipo: 'saida', categoria: 'comissao', veiculoId: dados.veiculoId, motoristaId: dados.motoristaId,
          valor: R.calcularComissao(dados.valor, mot.comissaoPct),
          descricao: `Comissão ${mot.comissaoPct}% sobre frete${dados.documento ? ' ' + dados.documento : ''}`, documento: dados.documento
        }));
      }
      return out;
    });
    res.status(201).json(criados);
  });
  api.put('/lancamentos/:id', (req, res) => {
    if (!repo.obter('lancamentos', req.params.id)) throw new ErroValidacao('Lançamento não encontrado.', 404);
    const dados = validarLancamento(req.body);
    const l = repo.transacao(() => {
      const atualizado = repo.atualizar('lancamentos', req.params.id, dados);
      atualizarHodometro(dados.veiculoId, dados.km);
      return atualizado;
    });
    res.json(l);
  });
  api.delete('/lancamentos/:id', (req, res) => {
    if (!repo.remover('lancamentos', req.params.id)) throw new ErroValidacao('Lançamento não encontrado.', 404);
    res.status(204).end();
  });
  api.get('/lancamentos.csv', (req, res) => {
    const f = filtros(req.query);
    const veics = Object.fromEntries(repo.listar('veiculos').map((v) => [v.id, v.placa]));
    const mots = Object.fromEntries(repo.listar('motoristas').map((m) => [m.id, m.nome]));
    const lista = repo.buscarLancamentos(f).sort((a, b) => a.data.localeCompare(b.data));
    enviarCsv(res, `pantanal-lancamentos${f.mes ? '-' + f.mes : ''}.csv`, [
      ['Data', 'Placa', 'Entrada/Saída', 'Tipo', 'Descrição', 'Motorista', 'Documento', 'Km', 'Litros', 'Valor (R$)'],
      ...lista.map((l) => [dataBR(l.data), veics[l.veiculoId] || '', l.tipo === 'entrada' ? 'Entrada' : 'Saída', R.nomeCategoria(l.categoria), l.descricao, mots[l.motoristaId] || '', l.documento, l.km ?? '', l.litros ? br(l.litros) : '', br(l.valor)])
    ]);
  });

  // Vencimentos
  api.get('/vencimentos', (_req, res) => {
    const veiculos = repo.listar('veiculos');
    const motoristas = repo.listar('motoristas');
    res.json({ itens: R.vencimentos(veiculos, motoristas), semData: R.documentosSemData(veiculos, motoristas) });
  });
  api.post('/vencimentos/renovar', (req, res) => {
    const { alvo, id, campo, novaData, valor, veiculoId } = req.body || {};
    const docs = alvo === 'veiculos' ? R.DOCS_VEICULO : alvo === 'motoristas' ? R.DOCS_MOTORISTA : null;
    const doc = docs && docs.find((d) => d.campo === campo);
    if (!doc) throw new ErroValidacao('Documento inválido.');
    const reg = repo.obter(alvo, id);
    if (!reg) throw new ErroValidacao('Cadastro não encontrado.', 404);
    const data = dataISO(novaData, 'a nova validade', true);
    const quem = alvo === 'veiculos' ? reg.placa : reg.nome;
    const r = repo.transacao(() => {
      const atualizado = repo.atualizar(alvo, id, { ...reg, [campo]: data });
      let lancamento = null;
      if (Number(valor) > 0) {
        lancamento = repo.inserir('lancamentos', {
          data: R.hojeISO(), tipo: 'saida', categoria: doc.categoria,
          veiculoId: (alvo === 'veiculos' ? id : veiculoId) || null, motoristaId: alvo === 'motoristas' ? id : null,
          valor: Math.round(Number(valor) * 100) / 100, descricao: `Renovação ${doc.nome} · ${quem}`
        });
      }
      return { atualizado, lancamento };
    });
    res.json(r);
  });

  // Painel
  api.get('/painel', (req, res) => {
    const mes = mesParam(req.query.mes);
    const lancs = repo.buscarLancamentos({ mes });
    const veiculos = repo.listar('veiculos', 'placa');
    const motoristas = repo.listar('motoristas');
    const venc = R.vencimentos(veiculos, motoristas);
    const multasAbertas = repo.buscarLancamentos({ categoria: 'multa', statusMulta: 'Em aberto' });
    const meses = Array.from({ length: 6 }, (_, i) => R.deslocarMes(mes, i - 5));
    res.json({
      mes,
      resumo: R.resumo(lancs),
      anterior: R.resumo(repo.buscarLancamentos({ mes: R.deslocarMes(mes, -1) })),
      serie: meses.map((m) => { const r = R.resumo(repo.buscarLancamentos({ mes: m })); return { mes: m, entradas: r.entradas, saidas: r.saidas }; }),
      vencidos: venc.filter((v) => v.situacao === 'vencido').length,
      proximos: venc.filter((v) => v.situacao === 'proximo').length,
      alertas: venc.filter((v) => v.situacao !== 'ok').slice(0, 7),
      multasAbertas: { quantidade: multasAbertas.length, valor: multasAbertas.reduce((s, l) => s + l.valor, 0) },
      porVeiculo: veiculos.filter((v) => v.ativo).map((v) => ({ veiculo: v, resumo: R.resumo(lancs.filter((l) => l.veiculoId === v.id)) })),
      despesasPorCategoria: R.porCategoria(lancs, 'saida')
    });
  });

  // Multas
  api.get('/multas', (req, res) => {
    const lista = repo.buscarLancamentos({ categoria: 'multa', statusMulta: req.query.status || '', veiculoId: req.query.veiculoId || '' });
    const umAno = R.hojeISO(new Date(Date.now() - 365 * 86400000));
    const pontos = {};
    for (const l of repo.buscarLancamentos({ categoria: 'multa' })) {
      if (!l.motoristaId || l.statusMulta === 'Em recurso' || l.data < umAno) continue;
      pontos[l.motoristaId] = (pontos[l.motoristaId] || 0) + (l.pontos || 0);
    }
    const lider = Object.entries(pontos).sort((a, b) => b[1] - a[1])[0];
    const abertas = lista.filter((l) => (l.statusMulta || 'Em aberto') === 'Em aberto');
    res.json({
      multas: lista,
      total: lista.reduce((s, l) => s + l.valor, 0),
      abertas: { quantidade: abertas.length, valor: abertas.reduce((s, l) => s + l.valor, 0) },
      maisPontos: lider ? { motoristaId: lider[0], pontos: lider[1] } : null
    });
  });

  // Relatório mensal
  api.get('/relatorio', (req, res) => {
    const mes = mesParam(req.query.mes);
    res.json(req.query.veiculoId ? relatorioVeiculo(mes, req.query.veiculoId) : relatorioFrota(mes));
  });
  api.get('/relatorio.csv', (req, res) => {
    const mes = mesParam(req.query.mes);
    if (req.query.veiculoId) {
      const r = relatorioVeiculo(mes, req.query.veiculoId);
      const mots = Object.fromEntries(repo.listar('motoristas').map((m) => [m.id, m.nome]));
      const s = r.resumo;
      return enviarCsv(res, `pantanal-${r.veiculo.placa}-${mes}.csv`, [
        ['Relatório mensal', r.veiculo.placa, mes], [],
        ['Data', 'Entrada/Saída', 'Tipo', 'Descrição', 'Motorista', 'Km', 'Valor (R$)', 'Saldo (R$)'],
        ...r.lancamentos.map((l) => [dataBR(l.data), l.tipo === 'entrada' ? 'Entrada' : 'Saída', R.nomeCategoria(l.categoria), l.descricao, mots[l.motoristaId] || '', l.km ?? '', (l.tipo === 'entrada' ? '' : '-') + br(l.valor), br(l.saldo)]),
        [], ['Entradas', br(s.entradas)], ['Saídas', br(s.saidas)], ['Resultado', br(s.resultado)], ['Km rodado', s.km], ['Km/L', s.kmPorLitro ? br(s.kmPorLitro) : ''], ['Custo por km', s.custoPorKm ? br(s.custoPorKm) : '']
      ]);
    }
    const r = relatorioFrota(mes);
    enviarCsv(res, `pantanal-relatorio-frota-${mes}.csv`, [
      ['Placa', 'Modelo', 'Entradas (R$)', 'Saídas (R$)', 'Resultado (R$)', 'Margem (%)', 'Km rodado', 'Km/L', 'Custo/km (R$)'],
      ...r.veiculos.map(({ veiculo: v, resumo: s }) => [v.placa, [v.marca, v.modelo].filter(Boolean).join(' '), br(s.entradas), br(s.saidas), br(s.resultado), s.entradas ? br(s.margem) : '', s.km || '', s.kmPorLitro ? br(s.kmPorLitro) : '', s.custoPorKm ? br(s.custoPorKm) : '']),
      ['Frota', '', br(r.total.entradas), br(r.total.saidas), br(r.total.resultado), r.total.entradas ? br(r.total.margem) : '', '', '', '']
    ]);
  });

  app.use('/api', api);

  const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'web', 'dist');
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(resolve(dist, 'index.html')));
  }

  app.use((err, _req, res, _next) => {
    if (err instanceof ErroValidacao) return res.status(err.status).json({ erro: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ erro: 'Corpo da requisição inválido.' });
    console.error(err);
    res.status(500).json({ erro: 'Erro interno ao processar a solicitação.' });
  });

  return app;
}
