import { useState } from 'react';
import { api } from '../api.js';
import { useCarregar, useDados } from '../contexto.jsx';
import { Cabecalho } from '../components/Layout.jsx';
import { ChipVencimento, Vazio } from '../components/ui.jsx';
import { FormMotorista } from '../components/formularios.jsx';
import { dinheiro, mesAtual, numero } from '../util.js';

export default function Motoristas() {
  const { meta, motoristas } = useDados();
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null);
  const mes = mesAtual();
  const lancs = useCarregar(() => api.get(`/lancamentos?mes=${mes}`), [mes]);
  const totais = (id) => {
    const ls = lancs.dados?.lancamentos.filter((l) => l.motoristaId === id) || [];
    return {
      fretes: ls.filter((l) => l.tipo === 'entrada' && l.categoria === 'frete').reduce((s, l) => s + l.valor, 0),
      comissao: ls.filter((l) => l.categoria === 'comissao').reduce((s, l) => s + l.valor, 0)
    };
  };
  const t = q.toLowerCase();
  const lista = motoristas.filter((m) => !t || [m.nome, m.cpf, m.cnhNumero, m.telefone].join(' ').toLowerCase().includes(t));

  return (
    <>
      <Cabecalho id="motoristas" acoes={<button className="btn primary" onClick={() => setModal({})}>Novo motorista</button>} />
      <section className="view">
        <div className="toolbar">
          <input className="input search" id="f-mot" placeholder="Buscar nome, CPF, CNH…" value={q} onChange={(e) => setQ(e.target.value)} />
          <span className="lbl-s">{lista.length} motoristas</span>
        </div>
        <div className="panel">
          {lista.length ? (
            <div className="tbl-wrap"><table>
              <thead><tr><th>Motorista</th><th>CNH</th><th>Documentos</th><th className="r">Comissão</th><th className="r">Fretes no mês</th><th className="r">Comissão no mês</th><th></th></tr></thead>
              <tbody>
                {lista.map((m) => {
                  const tt = totais(m.id);
                  return (
                    <tr key={m.id}>
                      <td><b>{m.nome}</b>{!m.ativo && <> <span className="chip">Desligado</span></>}<span className="cell-sub">{[m.cpf && `CPF ${m.cpf}`, m.telefone].filter(Boolean).join(' · ')}</span></td>
                      <td>{m.cnhCategoria ? `Cat. ${m.cnhCategoria}` : '—'}<span className="cell-sub mono">{m.cnhNumero}</span></td>
                      <td><div className="toolbar">{meta?.docsMotorista.map((d) => <ChipVencimento key={d.campo} nome={d.curto} data={m[d.campo]} diasAlerta={meta.diasAlerta} />)}</div></td>
                      <td className="r num">{m.comissaoPct ? `${numero(m.comissaoPct)}%` : '—'}</td>
                      <td className="r num">{dinheiro(tt.fretes)}</td>
                      <td className="r num">{dinheiro(tt.comissao)}</td>
                      <td className="r"><button className="btn sm ghost" onClick={() => setModal({ motorista: m })}>Editar</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          ) : (
            <Vazio titulo={motoristas.length ? 'Nenhum motorista encontrado' : 'Nenhum motorista cadastrado'} texto={motoristas.length ? 'Ajuste a busca.' : 'Cadastre CNH, exames e percentual de comissão de cada motorista.'}>
              <button className="btn primary" onClick={() => setModal({})}>Cadastrar motorista</button>
            </Vazio>
          )}
        </div>
      </section>
      {modal && <FormMotorista motorista={modal.motorista} onFechar={() => setModal(null)} />}
    </>
  );
}
