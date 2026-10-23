import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, baixar, query } from '../api.js';
import { useCarregar, useDados } from '../contexto.jsx';
import { Cabecalho } from '../components/Layout.jsx';
import { Barras, Carregando, Kpi, Vazio } from '../components/ui.jsx';
import { FormLancamento } from '../components/formularios.jsx';
import { BotoesLancamento } from './Painel.jsx';
import { classeValor, dataBR, deslocarMes, dinheiro, mesAtual, nomeMes, numero, numero2 } from '../util.js';

export default function Relatorio() {
  const { veiculos, motorista, nomeCategoria } = useDados();
  const [params, setParams] = useSearchParams();
  const mes = params.get('mes') || mesAtual();
  const veiculoId = params.get('veiculo') || '';
  const [modal, setModal] = useState(null);
  const { dados, erro } = useCarregar(() => api.get(`/relatorio${query({ mes, veiculoId })}`), [mes, veiculoId]);
  const ir = (novo) => setParams(Object.fromEntries(Object.entries({ mes, veiculo: veiculoId, ...novo }).filter(([, v]) => v)));

  const filtros = (
    <div className="toolbar">
      <input className="input w-auto" type="month" id="f-rmes" aria-label="Mês" value={mes} onChange={(e) => ir({ mes: e.target.value || mesAtual() })} />
      <button className="btn sm ghost" onClick={() => ir({ mes: deslocarMes(mes, -1) })}>Anterior</button>
      <button className="btn sm ghost" onClick={() => ir({ mes: deslocarMes(mes, 1) })}>Próximo</button>
      <select className="input w-auto" id="f-rveic" value={veiculoId} onChange={(e) => ir({ veiculo: e.target.value })}>
        <option value="">Todos os veículos</option>
        {veiculos.map((v) => <option key={v.id} value={v.id}>{v.placa}{v.modelo ? ` · ${v.modelo}` : ''}</option>)}
      </select>
    </div>
  );

  return (
    <>
      <Cabecalho id="relatorio" acoes={<button className="btn" onClick={() => baixar(`/relatorio.csv${query({ mes, veiculoId })}`)}>Exportar CSV</button>} />
      <section className="view">
        {filtros}
        {!dados ? <Carregando erro={erro} /> : !veiculoId ? (
          <>
            <div className="kpis">
              <Kpi rotulo="Resultado da frota" valor={dinheiro(dados.total.resultado)} classe="brand" classeValor={dados.total.resultado < 0 ? 'neg' : 'pos'} dica={nomeMes(mes)} />
              <Kpi rotulo="Entradas" valor={dinheiro(dados.total.entradas)} classeValor="pos" />
              <Kpi rotulo="Saídas" valor={dinheiro(dados.total.saidas)} classeValor="neg" />
              <Kpi rotulo="Margem" valor={dados.total.entradas ? `${numero(dados.total.margem)}%` : '—'} dica="Resultado sobre entradas" />
            </div>
            <div className="panel">
              <div className="panel-h"><h2>Resultado por veículo · {nomeMes(mes)}</h2></div>
              {dados.veiculos.length ? (
                <div className="tbl-wrap"><table>
                  <thead><tr><th>Veículo</th><th className="r">Entradas</th><th className="r">Saídas</th><th className="r">Resultado</th><th className="r">Margem</th><th className="r">Km rodado</th><th className="r">Km/L</th><th className="r">Custo/km</th></tr></thead>
                  <tbody>
                    {dados.veiculos.map(({ veiculo: v, resumo: r }) => (
                      <tr key={v.id} className="click" onClick={() => ir({ veiculo: v.id })}>
                        <td><span className="placa">{v.placa}</span><span className="cell-sub">{[v.marca, v.modelo].filter(Boolean).join(' ')}</span></td>
                        <td className="r num">{dinheiro(r.entradas)}</td>
                        <td className="r num">{dinheiro(r.saidas)}</td>
                        <td className={`r num ${classeValor(r.resultado)}`}>{dinheiro(r.resultado)}</td>
                        <td className="r num">{r.entradas ? `${numero(r.margem)}%` : '—'}</td>
                        <td className="r num">{r.km ? numero(r.km) : '—'}</td>
                        <td className="r num">{r.kmPorLitro ? numero2(r.kmPorLitro) : '—'}</td>
                        <td className="r num">{r.custoPorKm ? dinheiro(r.custoPorKm) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr>
                    <td>Frota{dados.semVeiculo ? <span className="cell-sub" style={{ display: 'inline' }}> (inclui {dados.semVeiculo} lançamento{dados.semVeiculo > 1 ? 's' : ''} sem veículo)</span> : null}</td>
                    <td className="r num">{dinheiro(dados.total.entradas)}</td>
                    <td className="r num">{dinheiro(dados.total.saidas)}</td>
                    <td className={`r num ${classeValor(dados.total.resultado)}`}>{dinheiro(dados.total.resultado)}</td>
                    <td className="r num">{dados.total.entradas ? `${numero(dados.total.margem)}%` : '—'}</td>
                    <td /><td /><td />
                  </tr></tfoot>
                </table></div>
              ) : <Vazio titulo="Nenhum veículo cadastrado" texto="Cadastre os veículos para gerar o relatório." />}
            </div>
          </>
        ) : (
          <RelatorioVeiculo d={dados} mes={mes} motorista={motorista} nomeCategoria={nomeCategoria} voltar={() => ir({ veiculo: '' })} abrir={setModal} />
        )}
      </section>
      {modal && <FormLancamento lancamento={modal.lancamento} preset={modal.preset} onFechar={() => setModal(null)} />}
    </>
  );
}

function RelatorioVeiculo({ d, mes, motorista, nomeCategoria, voltar, abrir }) {
  const { veiculo: v, resumo: r, anterior: a } = d;
  return (
    <>
      <div className="panel">
        <div className="panel-b rep-head">
          <div className="veh">
            <span className="placa" style={{ fontSize: 16 }}>{v.placa}</span>
            <div>
              <b>{[v.marca, v.modelo].filter(Boolean).join(' ') || 'Veículo'}{v.ano ? ` · ${v.ano}` : ''}</b>
              <span className="cell-sub">{v.tipo} · Motorista: {d.motorista?.nome || 'não definido'} · {nomeMes(mes)}</span>
            </div>
          </div>
          <button className="btn sm ghost" onClick={voltar}>Todos os veículos</button>
        </div>
      </div>
      <div className="kpis">
        <Kpi rotulo="Resultado" valor={dinheiro(r.resultado)} classe="brand" classeValor={r.resultado < 0 ? 'neg' : 'pos'} dica={a.entradas || a.saidas ? `Mês anterior: ${dinheiro(a.resultado)}` : 'Entradas menos saídas'} />
        <Kpi rotulo="Entradas" valor={dinheiro(r.entradas)} classeValor="pos" dica={`${r.qtdEntradas} lançamentos`} />
        <Kpi rotulo="Saídas" valor={dinheiro(r.saidas)} classeValor="neg" dica={`${r.qtdSaidas} lançamentos`} />
        <Kpi rotulo="Km rodado" valor={r.km ? `${numero(r.km)} km` : '—'} dica={r.km ? 'Pelo km informado nos lançamentos' : 'Informe o km em 2 lançamentos ou mais'} />
        <Kpi rotulo="Consumo" valor={r.kmPorLitro ? `${numero2(r.kmPorLitro)} km/L` : '—'} dica={r.litros ? `${numero(r.litros)} litros abastecidos` : 'Informe os litros no combustível'} />
        <Kpi rotulo="Custo por km" valor={r.custoPorKm ? dinheiro(r.custoPorKm) : '—'} dica="Saídas ÷ km rodado" />
      </div>
      <div className="grid g2">
        <div className="panel">
          <div className="panel-h"><h2>Saídas por tipo</h2><span className="lbl-s">{dinheiro(r.saidas)}</span></div>
          <div className="panel-b">{d.saidasPorCategoria.length ? <Barras itens={d.saidasPorCategoria} classe="out" /> : <Vazio titulo="Sem saídas" texto="Nenhuma despesa neste mês." />}</div>
        </div>
        <div className="panel">
          <div className="panel-h"><h2>Entradas por tipo</h2><span className="lbl-s">{dinheiro(r.entradas)}</span></div>
          <div className="panel-b">{d.entradasPorCategoria.length ? <Barras itens={d.entradasPorCategoria} classe="in" /> : <Vazio titulo="Sem entradas" texto="Nenhum frete lançado neste mês." />}</div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-h">
          <h2>Lançamentos do mês</h2>
          <div className="toolbar"><BotoesLancamento abrir={(preset) => abrir({ preset })} veiculoId={v.id} /></div>
        </div>
        {d.lancamentos.length ? (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th className="r">Km</th><th className="r">Entrada</th><th className="r">Saída</th><th className="r">Saldo</th></tr></thead>
            <tbody>
              {d.lancamentos.map((l) => (
                <tr key={l.id} className="click" onClick={() => abrir({ lancamento: l })}>
                  <td className="num">{dataBR(l.data)}</td>
                  <td><span className={`chip ${l.tipo === 'entrada' ? 'in' : 'out'}`}>{nomeCategoria(l.categoria)}</span></td>
                  <td>{l.descricao || '—'}{l.motoristaId && <span className="cell-sub">{motorista(l.motoristaId)?.nome}</span>}</td>
                  <td className="r num">{l.km ? numero(l.km) : '—'}</td>
                  <td className="r num v-in">{l.tipo === 'entrada' ? dinheiro(l.valor) : ''}</td>
                  <td className="r num v-out">{l.tipo === 'saida' ? dinheiro(l.valor) : ''}</td>
                  <td className={`r num ${l.saldo < 0 ? 'v-out' : ''}`}>{dinheiro(l.saldo)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr>
              <td colSpan="4">Total do mês</td>
              <td className="r num">{dinheiro(r.entradas)}</td>
              <td className="r num">{dinheiro(r.saidas)}</td>
              <td className={`r num ${classeValor(r.resultado)}`}>{dinheiro(r.resultado)}</td>
            </tr></tfoot>
          </table></div>
        ) : <Vazio titulo="Sem lançamentos" texto={`Nenhuma entrada ou saída deste veículo em ${nomeMes(mes)}.`} />}
      </div>
    </>
  );
}
