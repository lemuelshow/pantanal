import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useCarregar } from '../contexto.jsx';
import { Cabecalho } from '../components/Layout.jsx';
import { Barras, Carregando, GraficoEntradasSaidas, Kpi, Vazio } from '../components/ui.jsx';
import { FormLancamento, FormRenovar, FormVeiculo } from '../components/formularios.jsx';
import { ItemVencimento } from './Vencimentos.jsx';
import { classeValor, deslocarMes, dinheiro, mesAtual, nomeMes, numero } from '../util.js';

export function BotoesLancamento({ abrir, veiculoId }) {
  return (
    <>
      <button className="btn in" onClick={() => abrir({ tipo: 'entrada', veiculoId })}>+ Entrada</button>
      <button className="btn primary" onClick={() => abrir({ tipo: 'saida', veiculoId })}>+ Despesa</button>
    </>
  );
}

export default function Painel() {
  const mes = mesAtual();
  const { dados: d, erro } = useCarregar(() => api.get(`/painel?mes=${mes}`), [mes]);
  const [modal, setModal] = useState(null);
  const navegar = useNavigate();
  const abrirLanc = (preset) => setModal({ tipo: 'lanc', preset });

  const variacao = d && d.anterior.resultado ? ((d.resumo.resultado - d.anterior.resultado) / Math.abs(d.anterior.resultado)) * 100 : null;

  return (
    <>
      <Cabecalho id="painel" acoes={<BotoesLancamento abrir={abrirLanc} />} />
      <section className="view">
        {!d ? <Carregando erro={erro} /> : (
          <>
            <div className="kpis">
              <Kpi rotulo={`Resultado de ${nomeMes(mes)}`} valor={dinheiro(d.resumo.resultado)} classe="brand" classeValor={d.resumo.resultado < 0 ? 'neg' : 'pos'}
                dica={variacao == null ? 'Entradas menos saídas' : `${variacao >= 0 ? '+' : ''}${numero(variacao)}% sobre ${nomeMes(deslocarMes(mes, -1), true)}`} />
              <Kpi rotulo="Entradas no mês" valor={dinheiro(d.resumo.entradas)} classeValor="pos" dica={`${d.resumo.qtdEntradas} lançamentos`} />
              <Kpi rotulo="Saídas no mês" valor={dinheiro(d.resumo.saidas)} classeValor="neg" dica={d.resumo.km ? `Custo de ${dinheiro(d.resumo.custoPorKm)} por km` : 'Informe o km nos lançamentos'} />
              <Kpi rotulo="Documentos vencidos" valor={d.vencidos} classe={d.vencidos ? 'alert' : ''} dica={`${d.proximos} vencem em até 30 dias`} />
              <Kpi rotulo="Multas em aberto" valor={d.multasAbertas.quantidade} classe={d.multasAbertas.quantidade ? 'alert' : ''} dica={dinheiro(d.multasAbertas.valor)} />
            </div>

            <div className="grid g3">
              <div className="panel">
                <div className="panel-h">
                  <h2>Entradas e saídas · últimos 6 meses</h2>
                  <div className="legend"><span><i style={{ background: 'var(--in)' }} />Entradas</span><span><i style={{ background: 'var(--out)' }} />Saídas</span></div>
                </div>
                <div className="panel-b"><GraficoEntradasSaidas serie={d.serie} /></div>
              </div>
              <div className="panel">
                <div className="panel-h"><h2>Vencimentos</h2><button className="btn sm ghost" onClick={() => navegar('/vencimentos')}>Ver todos</button></div>
                {d.alertas.length
                  ? <div className="venc-list">{d.alertas.map((x) => <ItemVencimento key={x.alvo + x.id + x.campo} item={x} onRenovar={() => setModal({ tipo: 'renovar', item: x })} />)}</div>
                  : <Vazio titulo="Tudo em dia" texto="Nenhum documento vencido ou vencendo nos próximos 30 dias." />}
              </div>
            </div>

            <div className="grid g2">
              <div className="panel">
                <div className="panel-h"><h2>Resultado por veículo · {nomeMes(mes)}</h2><button className="btn sm ghost" onClick={() => navegar('/relatorio')}>Relatório</button></div>
                {d.porVeiculo.length ? (
                  <div className="tbl-wrap"><table>
                    <thead><tr><th>Veículo</th><th className="r">Entradas</th><th className="r">Saídas</th><th className="r">Resultado</th></tr></thead>
                    <tbody>
                      {d.porVeiculo.map(({ veiculo: v, resumo: r }) => (
                        <tr key={v.id} className="click" onClick={() => navegar(`/relatorio?veiculo=${v.id}&mes=${mes}`)}>
                          <td><span className="placa">{v.placa}</span><span className="cell-sub">{[v.marca, v.modelo].filter(Boolean).join(' ')}</span></td>
                          <td className="r num">{dinheiro(r.entradas)}</td>
                          <td className="r num">{dinheiro(r.saidas)}</td>
                          <td className={`r num ${classeValor(r.resultado)}`}>{dinheiro(r.resultado)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                ) : (
                  <Vazio titulo="Nenhum veículo cadastrado" texto="Cadastre os veículos da frota para acompanhar o resultado de cada um.">
                    <button className="btn primary" onClick={() => setModal({ tipo: 'veiculo' })}>Cadastrar veículo</button>
                  </Vazio>
                )}
              </div>
              <div className="panel">
                <div className="panel-h"><h2>Despesas por tipo · {nomeMes(mes)}</h2></div>
                <div className="panel-b">
                  {d.despesasPorCategoria.length ? <Barras itens={d.despesasPorCategoria} classe="out" /> : <Vazio titulo="Sem despesas no mês" texto="Lance combustível, manutenção, pedágios e demais despesas." />}
                </div>
              </div>
            </div>
          </>
        )}
      </section>
      {modal?.tipo === 'lanc' && <FormLancamento preset={modal.preset} onFechar={() => setModal(null)} />}
      {modal?.tipo === 'renovar' && <FormRenovar item={modal.item} onFechar={() => setModal(null)} />}
      {modal?.tipo === 'veiculo' && <FormVeiculo onFechar={() => setModal(null)} />}
    </>
  );
}
