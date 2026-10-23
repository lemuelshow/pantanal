import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProvedorDados, useDados } from './contexto.jsx';
import Layout from './components/Layout.jsx';
import Painel from './pages/Painel.jsx';
import Lancamentos from './pages/Lancamentos.jsx';
import Veiculos from './pages/Veiculos.jsx';
import Motoristas from './pages/Motoristas.jsx';
import Vencimentos from './pages/Vencimentos.jsx';
import Multas from './pages/Multas.jsx';
import Relatorio from './pages/Relatorio.jsx';
import './styles.css';

function Rotas() {
  const { meta, erro } = useDados();
  if (!meta) {
    return <div className="loading">{erro ? `${erro}` : 'Carregando o Pantanal Frota…'}</div>;
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Painel />} />
        <Route path="lancamentos" element={<Lancamentos />} />
        <Route path="veiculos" element={<Veiculos />} />
        <Route path="motoristas" element={<Motoristas />} />
        <Route path="vencimentos" element={<Vencimentos />} />
        <Route path="multas" element={<Multas />} />
        <Route path="relatorio" element={<Relatorio />} />
        <Route path="*" element={<Painel />} />
      </Route>
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ProvedorDados>
        <Rotas />
      </ProvedorDados>
    </BrowserRouter>
  </React.StrictMode>
);
