import { useState } from 'react';
import { api } from '../api.js';
import { useDados } from '../contexto.jsx';
import { Campo, Confirmar, Modal } from './ui.jsx';
import { dataBR, hojeISO, numero, somarAnos } from '../util.js';

function useEnvio(onFechar, aoConcluir) {
  const { avisar, recarregar } = useDados();
  const [enviando, setEnviando] = useState(false);
  const enviar = async (fn, mensagem) => {
    setEnviando(true);
    try {
      const r = await fn();
      avisar(typeof mensagem === 'function' ? mensagem(r) : mensagem);
      recarregar();
      aoConcluir?.(r);
      onFechar();
    } catch (e) {
      avisar(e.message, false);
    } finally {
      setEnviando(false);
    }
  };
  return { enviando, enviar };
}

function Rodape({ onFechar, onExcluir, enviando }) {
  return (
    <>
      {onExcluir && <button type="button" className="btn danger" style={{ marginRight: 'auto' }} onClick={onExcluir}>Excluir</button>}
      <button type="button" className="btn ghost" onClick={onFechar}>Cancelar</button>
      <button type="submit" className="btn primary" disabled={enviando}>Salvar</button>
    </>
  );
}

const vazio = (v) => (v == null ? '' : v);

export function FormLancamento({ lancamento, preset = {}, onFechar }) {
  const { meta, veiculos, motoristas, veiculo, motorista, avisar, recarregar, nomeCategoria } = useDados();
  const editar = Boolean(lancamento?.id);
  const tipoInicial = lancamento?.tipo || preset.tipo || 'saida';
  const veicInicial = lancamento?.veiculoId || preset.veiculoId || '';
  const [f, setF] = useState(() => ({
    tipo: tipoInicial,
    data: lancamento?.data || hojeISO(),
    categoria: lancamento?.categoria || preset.categoria || (tipoInicial === 'entrada' ? 'frete' : 'combustivel'),
    veiculoId: veicInicial,
    motoristaId: lancamento?.motoristaId || veiculo(veicInicial)?.motoristaId || '',
    valor: vazio(lancamento?.valor),
    km: vazio(lancamento?.km),
    descricao: lancamento?.descricao || '',
    documento: lancamento?.documento || '',
    litros: vazio(lancamento?.litros),
    pontos: vazio(lancamento?.pontos),
    statusMulta: lancamento?.statusMulta || 'Em aberto',
    gerarComissao: true
  }));
  const [excluir, setExcluir] = useState(false);
  const { enviando, enviar } = useEnvio(onFechar);
  const set = (campo) => (e) => setF((x) => ({ ...x, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const categorias = f.tipo === 'entrada' ? meta.categoriasEntrada : meta.categoriasSaida;
  const v = veiculo(f.veiculoId);
  const mot = motorista(f.motoristaId);

  const trocarTipo = (tipo) => setF((x) => ({ ...x, tipo, categoria: tipo === 'entrada' ? 'frete' : 'combustivel' }));
  const trocarVeiculo = (e) => {
    const id = e.target.value;
    setF((x) => ({ ...x, veiculoId: id, motoristaId: x.motoristaId || veiculo(id)?.motoristaId || '' }));
  };

  const salvar = () => {
    if (!(Number(f.valor) > 0)) return avisar('Informe um valor maior que zero.', false);
    const corpo = { ...f, veiculoId: f.veiculoId || null, motoristaId: f.motoristaId || null };
    enviar(
      () => (editar ? api.put(`/lancamentos/${lancamento.id}`, corpo) : api.post('/lancamentos', corpo)),
      (r) => (editar ? 'Lançamento atualizado.' : `${f.tipo === 'entrada' ? 'Entrada' : 'Despesa'} lançada${Array.isArray(r) && r.length > 1 ? ' com a comissão do motorista' : ''}.`)
    );
  };

  if (excluir) {
    return (
      <Confirmar titulo="Excluir lançamento" rotulo="Excluir" onFechar={() => setExcluir(false)}
        texto={`Excluir ${nomeCategoria(lancamento.categoria)} de ${lancamento.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em ${dataBR(lancamento.data)}?`}
        onConfirmar={async () => {
          try { await api.del(`/lancamentos/${lancamento.id}`); avisar('Lançamento excluído.'); recarregar(); onFechar(); } catch (e) { avisar(e.message, false); }
        }} />
    );
  }

  return (
    <Modal titulo={editar ? 'Editar lançamento' : f.tipo === 'entrada' ? 'Nova entrada' : 'Nova despesa'} onFechar={onFechar} onEnviar={salvar}
      rodape={<Rodape onFechar={onFechar} enviando={enviando} onExcluir={editar ? () => setExcluir(true) : null} />}>
      <div className="tipo-toggle" role="group" aria-label="Entrada ou saída">
        <button type="button" data-tipo="entrada" aria-pressed={f.tipo === 'entrada'} onClick={() => trocarTipo('entrada')}>Entrada</button>
        <button type="button" data-tipo="saida" aria-pressed={f.tipo === 'saida'} onClick={() => trocarTipo('saida')}>Saída / despesa</button>
      </div>
      <div className="form-grid">
        <Campo id="l-data" rotulo="Data *"><input className="input" id="l-data" type="date" required value={f.data} onChange={set('data')} /></Campo>
        <Campo id="l-cat" rotulo="Tipo *">
          <select className="input" id="l-cat" value={f.categoria} onChange={set('categoria')}>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Campo>
        <Campo id="l-veic" rotulo="Veículo">
          <select className="input" id="l-veic" value={f.veiculoId} onChange={trocarVeiculo}>
            <option value="">Sem veículo (despesa geral)</option>
            {veiculos.filter((x) => x.ativo || x.id === f.veiculoId).map((x) => <option key={x.id} value={x.id}>{x.placa}{x.modelo ? ` · ${x.modelo}` : ''}</option>)}
          </select>
        </Campo>
        <Campo id="l-mot" rotulo="Motorista">
          <select className="input" id="l-mot" value={f.motoristaId} onChange={set('motoristaId')}>
            <option value="">Nenhum</option>
            {motoristas.filter((x) => x.ativo || x.id === f.motoristaId).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
        </Campo>
        <Campo id="l-valor" rotulo="Valor (R$) *"><input className="input" id="l-valor" type="number" min="0" step="0.01" inputMode="decimal" required value={f.valor} onChange={set('valor')} /></Campo>
        <Campo id="l-km" rotulo="Km do hodômetro"><input className="input" id="l-km" type="number" min="0" step="1" inputMode="numeric" value={f.km} onChange={set('km')} placeholder={v?.kmAtual ? `Último: ${numero(v.kmAtual)}` : ''} /></Campo>
        <Campo id="l-desc" rotulo="Descrição" classe="full"><input className="input" id="l-desc" value={f.descricao} onChange={set('descricao')} placeholder="Ex.: Frete Campo Grande x Cuiabá, diesel S10 no Posto Trevo" /></Campo>
        {f.categoria === 'combustivel' && (
          <Campo id="l-litros" rotulo="Litros"><input className="input" id="l-litros" type="number" min="0" step="0.01" value={f.litros} onChange={set('litros')} /></Campo>
        )}
        {f.categoria === 'multa' && (
          <>
            <Campo id="l-pontos" rotulo="Pontos na CNH"><input className="input" id="l-pontos" type="number" min="0" step="1" value={f.pontos} onChange={set('pontos')} /></Campo>
            <Campo id="l-st" rotulo="Situação da multa">
              <select className="input" id="l-st" value={f.statusMulta} onChange={set('statusMulta')}>
                {meta.statusMulta.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Campo>
          </>
        )}
        <Campo id="l-doc" rotulo={f.categoria === 'multa' ? 'Nº do auto de infração' : 'Documento (CT-e, NF, recibo)'}><input className="input" id="l-doc" value={f.documento} onChange={set('documento')} /></Campo>
        {!editar && f.categoria === 'frete' && (
          <label className="full check" style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" id="l-com" checked={f.gerarComissao} onChange={set('gerarComissao')} />
            Lançar também a comissão do motorista{mot?.comissaoPct ? ` (${numero(mot.comissaoPct)}%)` : ' (pelo % do cadastro)'}
          </label>
        )}
      </div>
    </Modal>
  );
}

export function FormVeiculo({ veiculo: v = {}, onFechar }) {
  const { meta, motoristas, avisar, recarregar } = useDados();
  const editar = Boolean(v.id);
  const [f, setF] = useState(() => ({
    placa: v.placa || '', tipo: v.tipo || 'Cavalo mecânico', ano: v.ano || '', marca: v.marca || '', modelo: v.modelo || '', renavam: v.renavam || '',
    kmAtual: vazio(v.kmAtual), motoristaId: v.motoristaId || '', ativo: v.ativo !== false,
    crlvVenc: v.crlvVenc || '', anttVenc: v.anttVenc || '', tacografoVenc: v.tacografoVenc || '', seguradora: v.seguradora || '', apolice: v.apolice || '', seguroVenc: v.seguroVenc || '', obs: v.obs || ''
  }));
  const [excluir, setExcluir] = useState(false);
  const { enviando, enviar } = useEnvio(onFechar);
  const set = (c) => (e) => setF((x) => ({ ...x, [c]: e.target.value }));
  const salvar = () => {
    const corpo = { ...f, ativo: f.ativo === true || f.ativo === 'true' };
    enviar(() => (editar ? api.put(`/veiculos/${v.id}`, corpo) : api.post('/veiculos', corpo)), (r) => (editar ? 'Veículo atualizado.' : `Veículo ${r.placa} cadastrado.`));
  };
  if (excluir) {
    return <Confirmar titulo="Excluir veículo" texto={`Excluir o veículo ${v.placa}?`} rotulo="Excluir" onFechar={() => setExcluir(false)}
      onConfirmar={async () => { try { await api.del(`/veiculos/${v.id}`); avisar('Veículo excluído.'); recarregar(); onFechar(); } catch (e) { avisar(e.message, false); setExcluir(false); } }} />;
  }
  const data = (id, campo, rotulo) => <Campo id={id} rotulo={rotulo}><input className="input" id={id} type="date" value={f[campo]} onChange={set(campo)} /></Campo>;
  return (
    <Modal titulo={editar ? 'Editar veículo' : 'Novo veículo'} largo onFechar={onFechar} onEnviar={salvar}
      rodape={<Rodape onFechar={onFechar} enviando={enviando} onExcluir={editar ? () => setExcluir(true) : null} />}>
      <div className="form-grid three">
        <Campo id="v-placa" rotulo="Placa *"><input className="input" id="v-placa" required value={f.placa} onChange={set('placa')} placeholder="ABC1D23" style={{ textTransform: 'uppercase' }} /></Campo>
        <Campo id="v-tipo" rotulo="Tipo"><select className="input" id="v-tipo" value={f.tipo} onChange={set('tipo')}>{meta.tiposVeiculo.map((t) => <option key={t}>{t}</option>)}</select></Campo>
        <Campo id="v-ano" rotulo="Ano"><input className="input" id="v-ano" value={f.ano} onChange={set('ano')} placeholder="2021/2022" /></Campo>
        <Campo id="v-marca" rotulo="Marca"><input className="input" id="v-marca" value={f.marca} onChange={set('marca')} /></Campo>
        <Campo id="v-modelo" rotulo="Modelo"><input className="input" id="v-modelo" value={f.modelo} onChange={set('modelo')} /></Campo>
        <Campo id="v-renavam" rotulo="RENAVAM"><input className="input" id="v-renavam" value={f.renavam} onChange={set('renavam')} inputMode="numeric" /></Campo>
        <Campo id="v-km" rotulo="Km atual"><input className="input" id="v-km" type="number" min="0" value={f.kmAtual} onChange={set('kmAtual')} /></Campo>
        <Campo id="v-mot" rotulo="Motorista principal">
          <select className="input" id="v-mot" value={f.motoristaId} onChange={set('motoristaId')}>
            <option value="">Nenhum</option>
            {motoristas.filter((m) => m.ativo || m.id === f.motoristaId).map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </Campo>
        <Campo id="v-ativo" rotulo="Situação">
          <select className="input" id="v-ativo" value={String(f.ativo)} onChange={(e) => setF((x) => ({ ...x, ativo: e.target.value === 'true' }))}>
            <option value="true">Em operação</option>
            <option value="false">Inativo / vendido</option>
          </select>
        </Campo>
        <div className="section-t">Documentos e seguro</div>
        {data('v-crlv', 'crlvVenc', 'Vencimento do CRLV')}
        {data('v-antt', 'anttVenc', 'Vencimento RNTRC / ANTT')}
        {data('v-taco', 'tacografoVenc', 'Aferição do tacógrafo')}
        <Campo id="v-seg" rotulo="Seguradora"><input className="input" id="v-seg" value={f.seguradora} onChange={set('seguradora')} /></Campo>
        <Campo id="v-apol" rotulo="Nº da apólice"><input className="input" id="v-apol" value={f.apolice} onChange={set('apolice')} /></Campo>
        {data('v-segv', 'seguroVenc', 'Vencimento do seguro')}
        <Campo id="v-obs" rotulo="Observações" classe="full"><textarea className="input" id="v-obs" value={f.obs} onChange={set('obs')} /></Campo>
      </div>
    </Modal>
  );
}

export function FormMotorista({ motorista: m = {}, onFechar }) {
  const { meta, avisar, recarregar } = useDados();
  const editar = Boolean(m.id);
  const [f, setF] = useState(() => ({
    nome: m.nome || '', cpf: m.cpf || '', telefone: m.telefone || '', comissaoPct: vazio(m.comissaoPct), cnhNumero: m.cnhNumero || '', cnhCategoria: m.cnhCategoria || '',
    cnhVenc: m.cnhVenc || '', toxicoVenc: m.toxicoVenc || '', asoVenc: m.asoVenc || '', ativo: m.ativo !== false
  }));
  const [excluir, setExcluir] = useState(false);
  const { enviando, enviar } = useEnvio(onFechar);
  const set = (c) => (e) => setF((x) => ({ ...x, [c]: e.target.value }));
  const salvar = () => {
    if (!f.nome.trim()) return avisar('Informe o nome do motorista.', false);
    enviar(() => (editar ? api.put(`/motoristas/${m.id}`, f) : api.post('/motoristas', f)), editar ? 'Motorista atualizado.' : 'Motorista cadastrado.');
  };
  if (excluir) {
    return <Confirmar titulo="Excluir motorista" texto={`Excluir ${m.nome}?`} rotulo="Excluir" onFechar={() => setExcluir(false)}
      onConfirmar={async () => { try { await api.del(`/motoristas/${m.id}`); avisar('Motorista excluído.'); recarregar(); onFechar(); } catch (e) { avisar(e.message, false); setExcluir(false); } }} />;
  }
  const data = (id, campo, rotulo) => <Campo id={id} rotulo={rotulo}><input className="input" id={id} type="date" value={f[campo]} onChange={set(campo)} /></Campo>;
  return (
    <Modal titulo={editar ? 'Editar motorista' : 'Novo motorista'} largo onFechar={onFechar} onEnviar={salvar}
      rodape={<Rodape onFechar={onFechar} enviando={enviando} onExcluir={editar ? () => setExcluir(true) : null} />}>
      <div className="form-grid three">
        <Campo id="m-nome" rotulo="Nome completo *" classe="full"><input className="input" id="m-nome" required value={f.nome} onChange={set('nome')} /></Campo>
        <Campo id="m-cpf" rotulo="CPF"><input className="input" id="m-cpf" value={f.cpf} onChange={set('cpf')} inputMode="numeric" /></Campo>
        <Campo id="m-tel" rotulo="Telefone / WhatsApp"><input className="input" id="m-tel" value={f.telefone} onChange={set('telefone')} inputMode="tel" /></Campo>
        <Campo id="m-com" rotulo="Comissão sobre frete (%)"><input className="input" id="m-com" type="number" min="0" max="100" step="0.1" value={f.comissaoPct} onChange={set('comissaoPct')} /></Campo>
        <div className="section-t">CNH e exames</div>
        <Campo id="m-cnh" rotulo="Nº da CNH"><input className="input" id="m-cnh" value={f.cnhNumero} onChange={set('cnhNumero')} inputMode="numeric" /></Campo>
        <Campo id="m-cat" rotulo="Categoria">
          <select className="input" id="m-cat" value={f.cnhCategoria} onChange={set('cnhCategoria')}>
            <option value="">—</option>
            {meta.categoriasCnh.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Campo>
        {data('m-cnhv', 'cnhVenc', 'Validade da CNH')}
        {data('m-tox', 'toxicoVenc', 'Validade do exame toxicológico')}
        {data('m-aso', 'asoVenc', 'Validade do exame médico (ASO)')}
        <Campo id="m-ativo" rotulo="Situação">
          <select className="input" id="m-ativo" value={String(f.ativo)} onChange={(e) => setF((x) => ({ ...x, ativo: e.target.value === 'true' }))}>
            <option value="true">Ativo</option>
            <option value="false">Desligado</option>
          </select>
        </Campo>
      </div>
    </Modal>
  );
}

export function FormRenovar({ item, onFechar }) {
  const { meta, veiculos } = useDados();
  const docs = item.alvo === 'veiculos' ? meta.docsVeiculo : meta.docsMotorista;
  const doc = docs.find((d) => d.campo === item.campo);
  const veicPadrao = item.alvo === 'veiculos' ? item.id : veiculos.find((v) => v.motoristaId === item.id)?.id || '';
  const [f, setF] = useState({ novaData: somarAnos(item.data, doc.anos), valor: '', veiculoId: veicPadrao });
  const { enviando, enviar } = useEnvio(onFechar);
  const salvar = () => enviar(() => api.post('/vencimentos/renovar', { alvo: item.alvo, id: item.id, campo: item.campo, ...f }), `${doc.nome} renovado até ${dataBR(f.novaData)}.`);
  return (
    <Modal titulo="Renovar documento" onFechar={onFechar} onEnviar={salvar}
      rodape={<><button type="button" className="btn ghost" onClick={onFechar}>Cancelar</button><button type="submit" className="btn primary" disabled={enviando}>Registrar renovação</button></>}>
      <p style={{ margin: 0 }}><b>{doc.nome}</b> · {item.quem}<span className="cell-sub">Validade atual: {dataBR(item.data)}</span></p>
      <div className="form-grid">
        <Campo id="r-data" rotulo="Nova validade *"><input className="input" id="r-data" type="date" required value={f.novaData} onChange={(e) => setF({ ...f, novaData: e.target.value })} /></Campo>
        <Campo id="r-valor" rotulo="Valor pago (R$)"><input className="input" id="r-valor" type="number" min="0" step="0.01" value={f.valor} placeholder="Opcional: lança como despesa" onChange={(e) => setF({ ...f, valor: e.target.value })} /></Campo>
        {item.alvo === 'motoristas' && (
          <Campo id="r-veic" rotulo="Lançar a despesa no veículo" classe="full">
            <select className="input" id="r-veic" value={f.veiculoId} onChange={(e) => setF({ ...f, veiculoId: e.target.value })}>
              <option value="">Sem veículo</option>
              {veiculos.map((v) => <option key={v.id} value={v.id}>{v.placa}</option>)}
            </select>
          </Campo>
        )}
      </div>
    </Modal>
  );
}
