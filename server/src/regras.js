export const CAT_SAIDA = [
  { id: 'combustivel', nome: 'Combustível' },
  { id: 'manutencao', nome: 'Manutenção' },
  { id: 'pneus', nome: 'Pneus' },
  { id: 'seguro', nome: 'Seguro' },
  { id: 'licenciamento', nome: 'Licenciamento / IPVA / CRLV' },
  { id: 'exames', nome: 'Exames de motorista' },
  { id: 'pedagio', nome: 'Pedágio' },
  { id: 'multa', nome: 'Multa' },
  { id: 'comissao', nome: 'Comissão' },
  { id: 'diarias', nome: 'Diárias / alimentação' },
  { id: 'salario', nome: 'Salário / encargos' },
  { id: 'outros_s', nome: 'Outras despesas' }
];

export const CAT_ENTRADA = [
  { id: 'frete', nome: 'Frete' },
  { id: 'adiantamento', nome: 'Adiantamento de frete' },
  { id: 'estadia', nome: 'Estadia / descarga' },
  { id: 'outros_e', nome: 'Outras entradas' }
];

export const TIPOS_VEICULO = ['Cavalo mecânico', 'Carreta', 'Bitrem', 'Truck', 'Toco', '3/4', 'VUC', 'Van', 'Utilitário', 'Outro'];
export const STATUS_MULTA = ['Em aberto', 'Paga', 'Em recurso', 'Condutor indicado'];
export const CATEGORIAS_CNH = ['B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'];

export const DOCS_VEICULO = [
  { campo: 'crlvVenc', nome: 'CRLV / licenciamento', curto: 'CRLV', categoria: 'licenciamento', anos: 1 },
  { campo: 'seguroVenc', nome: 'Seguro', curto: 'Seguro', categoria: 'seguro', anos: 1 },
  { campo: 'anttVenc', nome: 'RNTRC / ANTT', curto: 'ANTT', categoria: 'licenciamento', anos: 5 },
  { campo: 'tacografoVenc', nome: 'Aferição do tacógrafo', curto: 'Tacógrafo', categoria: 'manutencao', anos: 2 }
];

export const DOCS_MOTORISTA = [
  { campo: 'cnhVenc', nome: 'CNH', curto: 'CNH', categoria: 'exames', anos: 5 },
  { campo: 'toxicoVenc', nome: 'Exame toxicológico', curto: 'Toxicológico', categoria: 'exames', anos: 2 },
  { campo: 'asoVenc', nome: 'Exame médico (ASO)', curto: 'ASO', categoria: 'exames', anos: 1 }
];

export const DIAS_ALERTA = 30;

const TODAS_CATEGORIAS = [...CAT_SAIDA, ...CAT_ENTRADA];

export function nomeCategoria(id) {
  return TODAS_CATEGORIAS.find((c) => c.id === id)?.nome ?? id;
}

export function categoriaValida(tipo, categoria) {
  return (tipo === 'entrada' ? CAT_ENTRADA : CAT_SAIDA).some((c) => c.id === categoria);
}

export function hojeISO(agora = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${agora.getFullYear()}-${p(agora.getMonth() + 1)}-${p(agora.getDate())}`;
}

export function mesAtual(agora = new Date()) {
  return hojeISO(agora).slice(0, 7);
}

export function deslocarMes(mes, delta) {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(a, m - 1 + delta, 1, 12);
  return mesAtual(d);
}

export function diasAte(iso, hoje = hojeISO()) {
  return Math.round((new Date(`${iso.slice(0, 10)}T12:00:00`) - new Date(`${hoje}T12:00:00`)) / 86400000);
}

export function situacaoVencimento(dias) {
  if (dias < 0) return 'vencido';
  if (dias <= DIAS_ALERTA) return 'proximo';
  return 'ok';
}

export function somar(lancamentos, tipo) {
  return lancamentos.filter((l) => l.tipo === tipo).reduce((s, l) => s + Number(l.valor || 0), 0);
}

export function kmRodado(lancamentos) {
  const kms = lancamentos.map((l) => Number(l.km || 0)).filter((k) => k > 0);
  if (kms.length < 2) return 0;
  return Math.max(...kms) - Math.min(...kms);
}

export function resumo(lancamentos) {
  const entradas = somar(lancamentos, 'entrada');
  const saidas = somar(lancamentos, 'saida');
  const km = kmRodado(lancamentos);
  const litros = lancamentos.filter((l) => l.categoria === 'combustivel').reduce((s, l) => s + Number(l.litros || 0), 0);
  return {
    entradas,
    saidas,
    resultado: entradas - saidas,
    margem: entradas ? ((entradas - saidas) / entradas) * 100 : 0,
    km,
    litros,
    kmPorLitro: km && litros ? km / litros : 0,
    custoPorKm: km ? saidas / km : 0,
    qtdEntradas: lancamentos.filter((l) => l.tipo === 'entrada').length,
    qtdSaidas: lancamentos.filter((l) => l.tipo === 'saida').length
  };
}

export function porCategoria(lancamentos, tipo) {
  const lista = tipo === 'entrada' ? CAT_ENTRADA : CAT_SAIDA;
  return lista
    .map((c) => ({
      categoria: c.id,
      nome: c.nome,
      valor: lancamentos.filter((l) => l.tipo === tipo && l.categoria === c.id).reduce((s, l) => s + Number(l.valor || 0), 0)
    }))
    .filter((c) => c.valor > 0)
    .sort((a, b) => b.valor - a.valor);
}

export function vencimentos(veiculos, motoristas, hoje = hojeISO()) {
  const itens = [];
  for (const v of veiculos) {
    if (!v.ativo) continue;
    for (const d of DOCS_VEICULO) {
      if (!v[d.campo]) continue;
      itens.push({ alvo: 'veiculos', id: v.id, campo: d.campo, documento: d.nome, categoria: d.categoria, data: v[d.campo], quem: v.placa, detalhe: [v.marca, v.modelo].filter(Boolean).join(' ') });
    }
  }
  for (const m of motoristas) {
    if (!m.ativo) continue;
    for (const d of DOCS_MOTORISTA) {
      if (!m[d.campo]) continue;
      itens.push({ alvo: 'motoristas', id: m.id, campo: d.campo, documento: d.nome, categoria: d.categoria, data: m[d.campo], quem: m.nome, detalhe: 'Motorista' });
    }
  }
  for (const x of itens) {
    x.dias = diasAte(x.data, hoje);
    x.situacao = situacaoVencimento(x.dias);
  }
  return itens.sort((a, b) => a.dias - b.dias);
}

export function documentosSemData(veiculos, motoristas) {
  const out = [];
  for (const v of veiculos) {
    if (!v.ativo) continue;
    for (const d of DOCS_VEICULO) if (!v[d.campo]) out.push(`${d.nome} · ${v.placa}`);
  }
  for (const m of motoristas) {
    if (!m.ativo) continue;
    for (const d of DOCS_MOTORISTA) if (!m[d.campo]) out.push(`${d.nome} · ${m.nome}`);
  }
  return out;
}

export function normalizarPlaca(placa) {
  return String(placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function placaValida(placa) {
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placa);
}

export function calcularComissao(valorFrete, percentual) {
  return Math.round(Number(valorFrete) * Number(percentual)) / 100;
}
