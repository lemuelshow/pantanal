import { useEffect } from 'react';
import { dataBR, diasAte, dinheiro, nomeMes } from '../util.js';

export function Kpi({ rotulo, valor, dica, classe = '', classeValor = '' }) {
  return (
    <div className={`kpi ${classe}`}>
      <span className="lbl">{rotulo}</span>
      <span className={`val ${classeValor}`}>{valor}</span>
      <span className="hint">{dica}</span>
    </div>
  );
}

export function Vazio({ titulo, texto, children }) {
  return (
    <div className="empty">
      <strong>{titulo}</strong>
      <span>{texto}</span>
      {children}
    </div>
  );
}

export function Carregando({ erro }) {
  if (erro) return <div className="erro-box">{erro}</div>;
  return <div className="panel loading">Carregando…</div>;
}

export function Placa({ veiculo }) {
  if (!veiculo) return <span className="cell-sub">Sem veículo</span>;
  return <span className="placa">{veiculo.placa}</span>;
}

export function ChipVencimento({ nome, data, diasAlerta = 30 }) {
  if (!data) return <span className="chip" title="Sem data cadastrada">{nome}: —</span>;
  const d = diasAte(data);
  const cls = d < 0 ? 'out' : d <= diasAlerta ? 'warn' : 'in';
  const txt = d < 0 ? 'vencido' : d <= diasAlerta ? (d === 0 ? 'vence hoje' : `${d} dias`) : dataBR(data);
  return <span className={`chip ${cls}`} title={`${nome} até ${dataBR(data)}`}>{nome}: {txt}</span>;
}

export function Barras({ itens, classe = '' }) {
  const max = Math.max(1, ...itens.map((i) => i.valor));
  return (
    <div className="bars">
      {itens.map((i) => (
        <div className="bar-row" key={i.nome}>
          <span className="name" title={i.nome}>{i.nome}</span>
          <span className="bar-track"><span className={`bar-fill ${classe}`} style={{ width: `${(i.valor / max) * 100}%` }} /></span>
          <span className="num" style={{ textAlign: 'right', fontSize: 12 }}>{dinheiro(i.valor)}</span>
        </div>
      ))}
    </div>
  );
}

function teto(v) {
  if (v <= 0) return 1000;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}
const curto = (v) => (v >= 1e6 ? `R$${(v / 1e6).toFixed(1).replace('.', ',')}M` : v >= 1e3 ? `R$${Math.round(v / 1e3)}k` : `R$${Math.round(v)}`);

export function GraficoEntradasSaidas({ serie }) {
  const W = 600, H = 230, pl = 58, pb = 28, pt = 16, pr = 8;
  const topo = teto(Math.max(0, ...serie.flatMap((d) => [d.entradas, d.saidas])));
  const cw = (W - pl - pr) / serie.length;
  const bw = Math.min(26, cw * 0.32);
  const y = (v) => pt + (H - pt - pb) * (1 - v / topo);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Entradas e saídas por mês">
      {[0, 1, 2, 3, 4].map((i) => {
        const v = (topo * i) / 4;
        return (
          <g key={i}>
            <line className="grid-l" x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} />
            <text x={pl - 6} y={y(v) + 4} textAnchor="end">{curto(v)}</text>
          </g>
        );
      })}
      {serie.map((d, i) => {
        const cx = pl + cw * i + cw / 2;
        return (
          <g key={d.mes}>
            <rect className="bi" x={cx - bw - 2} y={y(d.entradas)} width={bw} height={Math.max(H - pb - y(d.entradas), 0)} rx="2"><title>{`Entradas ${dinheiro(d.entradas)}`}</title></rect>
            <rect className="bo" x={cx + 2} y={y(d.saidas)} width={bw} height={Math.max(H - pb - y(d.saidas), 0)} rx="2"><title>{`Saídas ${dinheiro(d.saidas)}`}</title></rect>
            <text x={cx} y={H - 9} textAnchor="middle">{nomeMes(d.mes, true)}</text>
          </g>
        );
      })}
    </svg>
  );
}

const IconeFechar = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
);

export function Modal({ titulo, largo, onFechar, onEnviar, rodape, children, enviando }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onFechar();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onFechar]);
  return (
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className={`dialog${largo ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="dlg-t">
        <form noValidate onSubmit={(e) => { e.preventDefault(); onEnviar?.(); }}>
          <div className="dialog-h">
            <h2 id="dlg-t">{titulo}</h2>
            <button type="button" className="btn ghost sm" onClick={onFechar} aria-label="Fechar"><IconeFechar /></button>
          </div>
          <div className="dialog-b">{children}</div>
          <div className="dialog-f">
            {rodape ?? (
              <>
                <button type="button" className="btn ghost" onClick={onFechar}>Cancelar</button>
                <button type="submit" className="btn primary" disabled={enviando}>Salvar</button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export function Campo({ id, rotulo, classe = '', children }) {
  return (
    <div className={`field ${classe}`}>
      <label htmlFor={id}>{rotulo}</label>
      {children}
    </div>
  );
}

export function Confirmar({ titulo, texto, rotulo, onConfirmar, onFechar }) {
  return (
    <Modal titulo={titulo} onFechar={onFechar} onEnviar={onConfirmar}
      rodape={<><button type="button" className="btn ghost" onClick={onFechar}>Voltar</button><button type="submit" className="btn danger">{rotulo}</button></>}>
      <p style={{ margin: 0 }}>{texto}</p>
    </Modal>
  );
}
