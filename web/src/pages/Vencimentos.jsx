import { useState } from 'react';
import { api } from '../api.js';
import { useCarregar } from '../contexto.jsx';
import { Cabecalho } from '../components/Layout.jsx';
import { Carregando, Kpi, Vazio } from '../components/ui.jsx';
import { FormRenovar } from '../components/formularios.jsx';
import { dataBR, textoPrazo } from '../util.js';

export function ItemVencimento({ item, onRenovar }) {
  return (
    <div className={`venc ${item.situacao}`}>
      <span className="stripe" />
      <div>
        <span className="t">{item.documento}</span> · {item.alvo === 'veiculos' ? <span className="placa">{item.quem}</span> : item.quem}
        <span className="cell-sub">{textoPrazo(item.dias)} · {dataBR(item.data)}</span>
      </div>
      <button className="btn sm" onClick={onRenovar}>Renovar</button>
    </div>
  );
}

export default function Vencimentos() {
  const [filtro, setFiltro] = useState('atencao');
  const [renovar, setRenovar] = useState(null);
  const { dados, erro } = useCarregar(() => api.get('/vencimentos'), []);
  const itens = dados?.itens || [];
  const lista = itens.filter((x) => (filtro === 'todos' ? true : filtro === 'vencido' ? x.situacao === 'vencido' : x.situacao !== 'ok'));
  const conta = (s) => itens.filter((x) => x.situacao === s).length;

  return (
    <>
      <Cabecalho id="vencimentos" />
      <section className="view">
        {!dados ? <Carregando erro={erro} /> : (
          <>
            <div className="kpis">
              <Kpi rotulo="Vencidos" valor={conta('vencido')} classe={conta('vencido') ? 'alert' : ''} dica="Regularizar antes de rodar" />
              <Kpi rotulo="Vencem em 30 dias" valor={conta('proximo')} dica="Programar a renovação" />
              <Kpi rotulo="Em dia" valor={conta('ok')} dica="Documentos com data cadastrada" />
              <Kpi rotulo="Sem data" valor={dados.semData.length} dica="Cadastre no veículo ou motorista" />
            </div>
            <div className="toolbar">
              <select className="input w-auto" id="f-ven" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
                <option value="atencao">Vencidos e próximos</option>
                <option value="vencido">Só vencidos</option>
                <option value="todos">Todos</option>
              </select>
            </div>
            <div className="panel">
              {lista.length
                ? <div className="venc-list">{lista.map((x) => <ItemVencimento key={x.alvo + x.id + x.campo} item={x} onRenovar={() => setRenovar(x)} />)}</div>
                : <Vazio titulo="Nada para renovar" texto="Nenhum documento neste filtro." />}
            </div>
            {dados.semData.length > 0 && (
              <div className="panel">
                <div className="panel-h"><h2>Documentos sem data cadastrada</h2><span className="lbl-s">{dados.semData.length} itens</span></div>
                <div className="panel-b"><div className="toolbar">{dados.semData.slice(0, 40).map((s) => <span key={s} className="chip">{s}</span>)}</div></div>
              </div>
            )}
          </>
        )}
      </section>
      {renovar && <FormRenovar item={renovar} onFechar={() => setRenovar(null)} />}
    </>
  );
}
