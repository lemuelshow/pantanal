const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const NUM = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const NUM2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const dinheiro = (v) => BRL.format(Number(v) || 0);
export const numero = (v) => NUM.format(Number(v) || 0);
export const numero2 = (v) => NUM2.format(Number(v) || 0);

export function hojeISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const mesAtual = () => hojeISO().slice(0, 7);

export function deslocarMes(mes, delta) {
  const [a, m] = mes.split('-').map(Number);
  return hojeISO(new Date(a, m - 1 + delta, 1, 12)).slice(0, 7);
}

export function nomeMes(mes, curto = false) {
  const [a, m] = mes.split('-');
  const nome = MESES[Number(m) - 1];
  return curto ? `${nome.slice(0, 3)}/${a.slice(2)}` : `${nome} de ${a}`;
}

export const dataBR = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');

export function diasAte(iso) {
  return Math.round((new Date(`${iso.slice(0, 10)}T12:00:00`) - new Date(`${hojeISO()}T12:00:00`)) / 86400000);
}

export function somarAnos(iso, anos) {
  const base = iso && iso > hojeISO() ? iso : hojeISO();
  const d = new Date(`${base}T12:00:00`);
  d.setFullYear(d.getFullYear() + anos);
  return hojeISO(d);
}

export function textoPrazo(dias) {
  if (dias < 0) return `Venceu há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? '' : 's'}`;
  if (dias === 0) return 'Vence hoje';
  return `Vence em ${dias} dia${dias === 1 ? '' : 's'}`;
}

export const classeValor = (v) => (v < 0 ? 'v-out' : 'v-in');
