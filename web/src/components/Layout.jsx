import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { api } from '../api.js';
import { useCarregar, useDados } from '../contexto.jsx';
import logo from '../assets/logo.png';
import logoBranca from '../assets/logo-branca.png';
import icone from '../assets/icone.png';

const ICONES = {
  painel: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  lancamentos: 'M7 17l-4-4 4-4M3 13h12M17 7l4 4-4 4M21 11H9',
  veiculos: 'M1 7h13v9H1zM14 10h4l3 3v3h-7M5.5 19.3a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6M17.5 19.3a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6',
  motoristas: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  vencimentos: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2',
  multas: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0',
  relatorio: 'M3 3v18h18M7 15l4-4 3 3 6-6'
};

export const PAGINAS = [
  { rota: '/', id: 'painel', nome: 'Painel', sub: 'Resultado do mês e o que precisa de atenção' },
  { rota: '/lancamentos', id: 'lancamentos', nome: 'Entradas e saídas', sub: 'Fretes recebidos e despesas de cada veículo' },
  { rota: '/veiculos', id: 'veiculos', nome: 'Veículos', sub: 'Frota, documentos e resultado do mês por veículo' },
  { rota: '/motoristas', id: 'motoristas', nome: 'Motoristas', sub: 'CNH, exames e comissão' },
  { rota: '/vencimentos', id: 'vencimentos', nome: 'Vencimentos', sub: 'CRLV, seguro, ANTT, tacógrafo, CNH e exames' },
  { rota: '/multas', id: 'multas', nome: 'Multas', sub: 'Autuações por veículo e motorista' },
  { rota: '/relatorio', id: 'relatorio', nome: 'Relatório mensal', sub: 'Entradas, saídas e resultado de cada veículo no mês' }
];

const Icone = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

export default function Layout() {
  const { erro } = useDados();
  const { pathname } = useLocation();
  const venc = useCarregar(() => api.get('/vencimentos'), [pathname]);
  const alertas = venc.dados ? venc.dados.itens.filter((i) => i.situacao !== 'ok').length : 0;
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  return (
    <div className="app">
      <aside className="nav" aria-label="Módulos">
        <div className="brand">
          <img className="logo logo-claro" src={logo} alt="Pantanal Licenças" width="208" height="59" />
          <img className="logo logo-escuro" src={logoBranca} alt="Pantanal Licenças" width="208" height="59" />
          <img className="logo-icone" src={icone} alt="Pantanal Licenças" width="38" height="38" />
        </div>
        <nav className="nav-list">
          {PAGINAS.map((p) => (
            <NavLink key={p.id} to={p.rota} end={p.rota === '/'} className="nav-btn">
              <Icone d={ICONES[p.id]} />
              <span>{p.nome}</span>
              {p.id === 'vencimentos' && alertas > 0 && <span className="badge" title="Vencidos ou vencendo em 30 dias">{alertas}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="nav-foot">
          <span className="conn"><i className={`dot ${erro ? 'off' : 'live'}`} />{erro ? 'Sem conexão com a API' : 'Conectado ao servidor'}</span>
          <span>{hoje}</span>
        </div>
      </aside>
      <div className="main">
        <Outlet />
      </div>
    </div>
  );
}

export function Cabecalho({ id, acoes }) {
  const p = PAGINAS.find((x) => x.id === id);
  return (
    <header className="topbar">
      <div>
        <h1>{p.nome}</h1>
        <div className="sub">{p.sub}</div>
      </div>
      <div className="actions">{acoes}</div>
    </header>
  );
}
