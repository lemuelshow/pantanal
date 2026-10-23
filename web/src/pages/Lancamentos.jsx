import { useEffect, useState } from 'react';
import { api, baixar, query } from '../api.js';
import { useCarregar, useDados } from '../contexto.jsx';
import { Cabecalho } from '../components/Layout.jsx';
import { Carregando, Kpi, Placa, Vazio } from '../components/ui.jsx';
import { FormLancamento } from '../components/formularios.jsx';
import { BotoesLancamento } from './Painel.jsx';
import { dataBR, dinheiro, mesAtual, nomeMes, numero, numero2 } from '../util.js';

export function TabelaLancamentos({ lancamentos, onEditar }) {
  const { veiculo, motorista, nomeCategoria } = useDados();
  return (
    <div className="tbl-wrap"><table>
      <thead><tr><th>Data</th><th>Veículo</th><th>Tipo</th><th>Descrição</th><th>Motorista</th><th className="r">Km</th><th className="r">Valor</th></tr></thead>
      <tbody>
        {lancamentos.map((l) => {
          const extra = l.categoria === 'combustivel' && l.litros
            ? `${numero2(l.litros)} L · ${dinheiro(l.valor / l.litros)}/L`
            : l.categoria === 'multa' ? `${l.statusMulta || 'Em aberto'}${l.pontos ? ` · ${l.pontos} pts` : ''}` : l.documento ? `Doc. ${l.documento}` : '';
          return (
            <tr key={l.id} className="click" onClick={() => onEditar(l)}>
              <td className="num">{dataBR(l.data)}</td>
              <td><Placa veiculo={veiculo(l.veiculoId)} /></td>
              <td><span className={`chip ${l.tipo === 'entrada' ? 'in' : 'out'}`}>{nomeCategoria(l.categoria)}</span></td>
              <td>{l.descricao || '—'}{extra && <span className="cell-sub">{extra}</span>}</td>
              <td>{motorista(l.motoristaId)?.nome || '—'}</td>
              <td className="r num">{l.km ? numero(l.km) : '—'}</td>
              <td className={`r num ${l.tipo === 'entrada' ? 'v-in' : 'v-out'}`}>{l.tipo === 'entrada' ? '+ ' : '− '}{dinheiro(l.valor)}</td>
            </tr>
          );
        })}
      </tbody>
    </table></div>
  );
}

export default function Lancamentos() {
  const { meta, veiculos } = useDados();
  const [f, setF] = useState({ mes: mesAtual(), veiculoId: '', tipo: '', categoria: '', q: '' });
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(null);
  useEffect(() => { const t = setTimeout(() => setF((x) => ({ ...x, q: busca })), 250); return () => clearTimeout(t); }, [busca]);
  const { dados, erro } = useCarregar(() => api.get(`/lancamentos${query(f)}`), [f.mes, f.veiculoId, f.tipo, f.categoria, f.q]);
  const set = (c) => (e) => setF((x) => ({ ...x, [c]: e.target.value }));

  return (
    <>
      <Cabecalho id="lancamentos" acoes={<>
        <button className="btn" onClick={() => baixar(`/lancamentos.csv${query(f)}`)}>Exportar CSV</button>
        <BotoesLancamento abrir={(preset) => setModal({ preset })} />
      </>} />
      <section className="view">
        <div className="toolbar">
          <input className="input w-auto" type="month" id="f-mes" aria-label="Mês" value={f.mes} onChange={set('mes')} />
          <select className="input w-auto" id="f-veic" value={f.veiculoId} onChange={set('veiculoId')}>
            <option value="">Todos os veículos</option>
            {veiculos.map((v) => <option key={v.id} value={v.id}>{v.placa}</option>)}
          </select>
          <select className="input w-auto" id="f-tipo" value={f.tipo} onChange={set('tipo')}>
            <option value="">Entradas e saídas</option><option value="entrada">Só entradas</option><option value="saida">Só saídas</option>
          </select>
          <select className="input w-auto" id="f-cat" value={f.categoria} onChange={set('categoria')}>
            <option value="">Todos os tipos</option>
            {meta && [...meta.categoriasEntrada, ...meta.categoriasSaida].map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <input className="input search" id="f-q" placeholder="Buscar descrição, documento, placa, motorista…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          {f.mes && <button className="btn sm ghost" onClick={() => setF((x) => ({ ...x, mes: '' }))}>Todos os meses</button>}
        </div>
        {!dados ? <Carregando erro={erro} /> : (
          <>
            <div className="kpis">
              <Kpi rotulo="Entradas" valor={dinheiro(dados.resumo.entradas)} classeValor="pos" dica={`${dados.resumo.qtdEntradas} lançamentos`} />
              <Kpi rotulo="Saídas" valor={dinheiro(dados.resumo.saidas)} classeValor="neg" dica={`${dados.resumo.qtdSaidas} lançamentos`} />
              <Kpi rotulo="Saldo do filtro" valor={dinheiro(dados.resumo.resultado)} classe="brand" classeValor={dados.resumo.resultado < 0 ? 'neg' : 'pos'} dica={f.mes ? nomeMes(f.mes) : 'Todos os meses'} />
            </div>
            <div className="panel">
              {dados.lancamentos.length
                ? <TabelaLancamentos lancamentos={dados.lancamentos} onEditar={(l) => setModal({ lancamento: l })} />
                : <Vazio titulo="Nenhum lançamento neste filtro" texto="Troque o mês, o veículo ou o tipo, ou registre um frete ou uma despesa.">
                    <div className="toolbar"><BotoesLancamento abrir={(preset) => setModal({ preset })} /></div>
                  </Vazio>}
            </div>
          </>
        )}
      </section>
      {modal && <FormLancamento lancamento={modal.lancamento} preset={modal.preset} onFechar={() => setModal(null)} />}
    </>
  );
}
