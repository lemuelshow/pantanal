import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useCarregar, useDados } from '../contexto.jsx';
import { Cabecalho } from '../components/Layout.jsx';
import { ChipVencimento, Vazio } from '../components/ui.jsx';
import { FormVeiculo } from '../components/formularios.jsx';
import { classeValor, dinheiro, mesAtual, nomeMes, numero } from '../util.js';

export default function Veiculos() {
  const { meta, veiculos, motorista } = useDados();
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null);
  const navegar = useNavigate();
  const mes = mesAtual();
  const rel = useCarregar(() => api.get(`/relatorio?mes=${mes}`), [mes]);
  const resumoDe = (id) => rel.dados?.veiculos.find((x) => x.veiculo.id === id)?.resumo;
  const t = q.toLowerCase();
  const lista = veiculos.filter((v) => !t || [v.placa, v.marca, v.modelo, v.tipo, v.renavam, motorista(v.motoristaId)?.nome].join(' ').toLowerCase().includes(t));

  return (
    <>
      <Cabecalho id="veiculos" acoes={<button className="btn primary" onClick={() => setModal({})}>Novo veículo</button>} />
      <section className="view">
        <div className="toolbar">
          <input className="input search" id="f-vei" placeholder="Buscar placa, modelo, motorista…" value={q} onChange={(e) => setQ(e.target.value)} />
          <span className="lbl-s">{lista.length} veículos · resultado de {nomeMes(mes)}</span>
        </div>
        {lista.length ? (
          <div className="vehicles">
            {lista.map((v) => {
              const r = resumoDe(v.id) || { entradas: 0, saidas: 0, resultado: 0 };
              return (
                <div className="vcard" key={v.id}>
                  <div className="row">
                    <span className="placa" style={{ fontSize: 14 }}>{v.placa}</span>
                    {v.ativo ? <span className="chip brand">{v.tipo || 'Veículo'}</span> : <span className="chip">Inativo</span>}
                  </div>
                  <div>
                    <div className="ttl">{[v.marca, v.modelo].filter(Boolean).join(' ') || 'Sem modelo'}{v.ano ? ` · ${v.ano}` : ''}</div>
                    <span className="cell-sub">Motorista: {motorista(v.motoristaId)?.nome || 'não definido'}{v.kmAtual ? ` · ${numero(v.kmAtual)} km` : ''}</span>
                  </div>
                  <div className="docs">
                    {meta?.docsVeiculo.map((d) => <ChipVencimento key={d.campo} nome={d.curto} data={v[d.campo]} diasAlerta={meta.diasAlerta} />)}
                  </div>
                  <div className="res">
                    <div><span className="lbl-s">Entradas</span><b className="v-in">{dinheiro(r.entradas)}</b></div>
                    <div><span className="lbl-s">Saídas</span><b className="v-out">{dinheiro(r.saidas)}</b></div>
                    <div><span className="lbl-s">Resultado</span><b className={classeValor(r.resultado)}>{dinheiro(r.resultado)}</b></div>
                  </div>
                  <div className="toolbar">
                    <button className="btn sm" onClick={() => navegar(`/relatorio?veiculo=${v.id}&mes=${mes}`)}>Relatório do mês</button>
                    <button className="btn sm ghost" onClick={() => setModal({ veiculo: v })}>Editar</button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="panel">
            <Vazio titulo={veiculos.length ? 'Nenhum veículo encontrado' : 'Nenhum veículo cadastrado'} texto={veiculos.length ? 'Ajuste a busca.' : 'Cadastre placa, documentos e seguro de cada veículo.'}>
              <button className="btn primary" onClick={() => setModal({})}>Cadastrar veículo</button>
            </Vazio>
          </div>
        )}
      </section>
      {modal && <FormVeiculo veiculo={modal.veiculo} onFechar={() => setModal(null)} />}
    </>
  );
}
