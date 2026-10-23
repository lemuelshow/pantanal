import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';

const Ctx = createContext(null);

export function ProvedorDados({ children }) {
  const [meta, setMeta] = useState(null);
  const [veiculos, setVeiculos] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [versao, setVersao] = useState(0);
  const [erro, setErro] = useState('');
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    api.get('/meta').then(setMeta).catch((e) => setErro(e.message));
  }, []);

  useEffect(() => {
    Promise.all([api.get('/veiculos'), api.get('/motoristas')])
      .then(([v, m]) => { setVeiculos(v); setMotoristas(m); setErro(''); })
      .catch((e) => setErro(e.message));
  }, [versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  const avisar = useCallback((texto, ok = true) => {
    setToast({ texto, ok });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3600);
  }, []);

  const valor = useMemo(() => {
    const todasCat = meta ? [...meta.categoriasSaida, ...meta.categoriasEntrada] : [];
    return {
      meta, veiculos, motoristas, versao, erro, recarregar, avisar,
      veiculo: (id) => veiculos.find((v) => v.id === id),
      motorista: (id) => motoristas.find((m) => m.id === id),
      nomeCategoria: (id) => todasCat.find((c) => c.id === id)?.nome ?? id
    };
  }, [meta, veiculos, motoristas, versao, erro, recarregar, avisar]);

  return (
    <Ctx.Provider value={valor}>
      {children}
      {toast && <div className={`toast${toast.ok ? ' ok' : ''}`} role="status">{toast.texto}</div>}
    </Ctx.Provider>
  );
}

export const useDados = () => useContext(Ctx);

export function useCarregar(fn, deps) {
  const { versao } = useDados();
  const [estado, setEstado] = useState({ dados: null, erro: '', carregando: true });
  useEffect(() => {
    let vivo = true;
    setEstado((e) => ({ ...e, carregando: true }));
    fn().then(
      (dados) => vivo && setEstado({ dados, erro: '', carregando: false }),
      (e) => vivo && setEstado({ dados: null, erro: e.message, carregando: false })
    );
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versao, ...deps]);
  return estado;
}
