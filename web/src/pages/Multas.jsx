import { useState } from 'react';
import { api, query } from '../api.js';
import { useCarregar, useDados } from '../contexto.jsx';
import { Cabecalho } from '../components/Layout.jsx';
import { Carregando, Kpi, Placa, Vazio } from '../components/ui.jsx';
import { FormLancamento } from '../components/formularios.jsx';
import { dataBR, dinheiro } from '../util.js';

export default function Multas() {
  const { meta, veiculos, veiculo, motorista } = useDados();
  const [f, setF] = useState({ status: '', veiculoId: '' });
  const [modal, setModal] = useState(null);
  const { dados, erro } = useCarregar(() => api.get(`/multas${query(f)}`), [f.status, f.veiculoId]);
  const nova = () => setModal({ preset: { tipo: 'saida', categoria: 'multa' } });

  return (
    <>
      <Cabecalho id="multas" acoes={<button className="btn primary" onClick={nova}>Lançar multa</button>} />
      <section className="view">
        {!dados ? <Carregando erro={erro} /> : (
          <>
            <div className="kpis">
              <Kpi rotulo="Multas no filtro" valor={dados.multas.length} dica={dinheiro(dados.total)} />
              <Kpi rotulo="Em aberto" valor={dados.abertas.quantidade} classe={dados.abertas.quantidade ? 'alert' : ''} dica={dinheiro(dados.abertas.valor)} />
              <Kpi rotulo="Motorista com mais pontos" valor={dados.maisPontos ? `${dados.maisPontos.pontos} pts` : '—'}
                dica={dados.maisPontos ? `${motorista(dados.maisPontos.motoristaId)?.nome ?? ''} · últimos 12 meses` : 'Sem pontos lançados'} />
            </div>
            <div className="toolbar">
              <select className="input w-auto" id="f-st" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
                <option value="">Todas as situações</option>
                {meta?.statusMulta.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select className="input w-auto" id="f-mv" value={f.veiculoId} onChange={(e) => setF({ ...f, veiculoId: e.target.value })}>
                <option value="">Todos os veículos</option>
                {veiculos.map((v) => <option key={v.id} value={v.id}>{v.placa}</option>)}
              </select>
            </div>
            <div className="panel">
              {dados.multas.length ? (
                <div className="tbl-wrap"><table>
                  <thead><tr><th>Data</th><th>Veículo</th><th>Infração</th><th>Motorista</th><th>Auto</th><th className="r">Pontos</th><th>Situação</th><th className="r">Valor</th></tr></thead>
                  <tbody>
                    {dados.multas.map((l) => {
                      const st = l.statusMulta || 'Em aberto';
                      return (
                        <tr key={l.id} className="click" onClick={() => setModal({ lancamento: l })}>
                          <td className="num">{dataBR(l.data)}</td>
                          <td><Placa veiculo={veiculo(l.veiculoId)} /></td>
                          <td>{l.descricao || '—'}</td>
                          <td>{motorista(l.motoristaId)?.nome || 'Não identificado'}</td>
                          <td className="mono">{l.documento || '—'}</td>
                          <td className="r num">{l.pontos || '—'}</td>
                          <td><span className={`chip ${st === 'Em aberto' ? 'out' : st === 'Paga' ? 'in' : 'warn'}`}>{st}</span></td>
                          <td className="r num v-out">{dinheiro(l.valor)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table></div>
              ) : (
                <Vazio titulo="Nenhuma multa" texto="Lance as autuações como despesa do tipo Multa, com auto, pontos e situação.">
                  <button className="btn primary" onClick={nova}>Lançar multa</button>
                </Vazio>
              )}
            </div>
          </>
        )}
      </section>
      {modal && <FormLancamento lancamento={modal.lancamento} preset={modal.preset} onFechar={() => setModal(null)} />}
    </>
  );
}
