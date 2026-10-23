import * as repo from './db.js';
import { deslocarMes, mesAtual } from './regras.js';

if (repo.listar('veiculos').length || repo.listar('motoristas').length) {
  console.log('O banco já tem dados. Nada foi inserido.');
  process.exit(0);
}

const m0 = mesAtual();
const m1 = deslocarMes(m0, -1);
const m2 = deslocarMes(m0, -2);
const dia = (mes, d) => `${mes}-${String(d).padStart(2, '0')}`;
const emDias = (dias) => {
  const d = new Date(Date.now() + dias * 86400000);
  return d.toISOString().slice(0, 10);
};

repo.transacao(() => {
  const joao = repo.inserir('motoristas', { nome: 'João Batista Ferreira (exemplo)', cpf: '000.111.222-33', telefone: '(67) 99999-1001', comissaoPct: 10, cnhNumero: '01234567890', cnhCategoria: 'E', cnhVenc: emDias(140), toxicoVenc: emDias(16), asoVenc: emDias(90), ativo: true });
  const carlos = repo.inserir('motoristas', { nome: 'Carlos Eduardo Lima (exemplo)', cpf: '000.333.444-55', telefone: '(67) 99999-1002', comissaoPct: 12, cnhNumero: '09876543210', cnhCategoria: 'E', cnhVenc: emDias(-13), toxicoVenc: emDias(220), asoVenc: emDias(53), ativo: true });
  const marcos = repo.inserir('motoristas', { nome: 'Marcos Antônio Souza (exemplo)', cpf: '000.555.666-77', telefone: '(67) 99999-1003', comissaoPct: 8, cnhNumero: '05555555555', cnhCategoria: 'D', cnhVenc: emDias(1040), toxicoVenc: emDias(325), asoVenc: emDias(160), ativo: true });

  const v1 = repo.inserir('veiculos', { placa: 'QAB1C23', tipo: 'Cavalo mecânico', ano: '2021/2022', marca: 'Scania', modelo: 'R 450', renavam: '01234567890', kmAtual: 412850, motoristaId: joao.id, ativo: true, crlvVenc: emDias(38), anttVenc: emDias(930), tacografoVenc: emDias(118), seguradora: 'Seguradora Exemplo', apolice: 'AP-77801', seguroVenc: emDias(13), obs: '' });
  const v2 = repo.inserir('veiculos', { placa: 'REX4F56', tipo: 'Truck', ano: '2019/2019', marca: 'Volkswagen', modelo: 'Constellation 24.280', renavam: '09876543210', kmAtual: 288400, motoristaId: carlos.id, ativo: true, crlvVenc: emDias(-23), anttVenc: emDias(270), tacografoVenc: emDias(39), seguradora: 'Seguradora Exemplo', apolice: 'AP-77802', seguroVenc: emDias(170), obs: '' });
  const v3 = repo.inserir('veiculos', { placa: 'NRT7G89', tipo: '3/4', ano: '2023/2023', marca: 'Mercedes-Benz', modelo: 'Accelo 1017', renavam: '05555555550', kmAtual: 96320, motoristaId: marcos.id, ativo: true, crlvVenc: emDias(250), anttVenc: emDias(815), tacografoVenc: emDias(290), seguradora: 'Seguradora Exemplo', apolice: 'AP-77803', seguroVenc: emDias(128), obs: '' });

  const L = (data, tipo, categoria, veiculo, motorista, valor, extra = {}) =>
    repo.inserir('lancamentos', { data, tipo, categoria, veiculoId: veiculo?.id ?? null, motoristaId: motorista?.id ?? null, valor, ...extra });

  L(dia(m2, 4), 'entrada', 'frete', v1, joao, 14800, { km: 398200, descricao: 'Frete Campo Grande x Cuiabá (soja)', documento: 'CT-e 1021' });
  L(dia(m2, 5), 'saida', 'combustivel', v1, joao, 4380, { km: 398650, litros: 730, descricao: 'Diesel S10' });
  L(dia(m2, 20), 'saida', 'manutencao', v1, null, 2650, { km: 401900, descricao: 'Troca de óleo e filtros', documento: 'NF 5531' });
  L(dia(m2, 12), 'entrada', 'frete', v2, carlos, 7900, { km: 276100, descricao: 'Frete Dourados x Campo Grande', documento: 'CT-e 1024' });
  L(dia(m2, 13), 'saida', 'combustivel', v2, carlos, 2210, { km: 276500, litros: 372, descricao: 'Diesel S10' });
  L(dia(m1, 3), 'entrada', 'frete', v1, joao, 16200, { km: 404100, descricao: 'Frete Campo Grande x Rondonópolis', documento: 'CT-e 1040' });
  L(dia(m1, 4), 'saida', 'combustivel', v1, joao, 4920, { km: 404600, litros: 810, descricao: 'Diesel S10' });
  L(dia(m1, 18), 'saida', 'pneus', v1, null, 6800, { km: 407300, descricao: '4 pneus 295/80 R22.5', documento: 'NF 7710' });
  L(dia(m1, 10), 'entrada', 'frete', v2, carlos, 8400, { km: 280900, descricao: 'Frete Três Lagoas x Campo Grande', documento: 'CT-e 1043' });
  L(dia(m1, 22), 'saida', 'multa', v2, carlos, 195.23, { descricao: 'Excesso de velocidade até 20% · BR-163', documento: 'AIT S012345', pontos: 4, statusMulta: 'Em aberto' });
  L(dia(m0, 2), 'entrada', 'frete', v1, joao, 15400, { km: 408900, descricao: 'Frete Campo Grande x Cuiabá (milho)', documento: 'CT-e 1061' });
  L(dia(m0, 2), 'saida', 'comissao', v1, joao, 1540, { descricao: 'Comissão 10% sobre frete CT-e 1061', documento: 'CT-e 1061' });
  L(dia(m0, 3), 'saida', 'combustivel', v1, joao, 4710, { km: 409350, litros: 780, descricao: 'Diesel S10' });
  L(dia(m0, 3), 'saida', 'pedagio', v1, joao, 486.6, { descricao: 'Pedágios BR-163 (ida e volta)' });
  L(dia(m0, 16), 'saida', 'combustivel', v1, joao, 4560, { km: 412850, litros: 755, descricao: 'Diesel S10' });
  L(dia(m0, 8), 'entrada', 'frete', v2, carlos, 8100, { km: 285200, descricao: 'Frete Campo Grande x Corumbá', documento: 'CT-e 1064' });
  L(dia(m0, 8), 'saida', 'comissao', v2, carlos, 972, { descricao: 'Comissão 12% sobre frete CT-e 1064', documento: 'CT-e 1064' });
  L(dia(m0, 9), 'saida', 'combustivel', v2, carlos, 2390, { km: 285700, litros: 398, descricao: 'Diesel S10' });
  L(dia(m0, 14), 'saida', 'manutencao', v2, null, 3870, { km: 288400, descricao: 'Freios: lonas e tambores', documento: 'NF 8120' });
  L(dia(m0, 11), 'entrada', 'frete', v3, marcos, 3600, { km: 95100, descricao: 'Entregas urbanas Campo Grande', documento: 'CT-e 1066' });
  L(dia(m0, 12), 'saida', 'combustivel', v3, marcos, 920, { km: 95600, litros: 152, descricao: 'Diesel S10' });
  L(dia(m0, 15), 'saida', 'seguro', v3, null, 890, { descricao: 'Parcela do seguro (6/10)', documento: 'AP-77803' });
  L(dia(m0, 19), 'saida', 'multa', v3, marcos, 293.47, { descricao: 'Estacionar em local proibido', documento: 'AIT M778899', pontos: 5, statusMulta: 'Em recurso' });
  L(dia(m0, 20), 'saida', 'exames', v2, carlos, 380, { descricao: 'Exame médico periódico (ASO)' });
  L(dia(m0, 21), 'entrada', 'frete', v3, marcos, 2950, { km: 96320, descricao: 'Entregas Sidrolândia e Terenos', documento: 'CT-e 1070' });
});

console.log('Dados de exemplo inseridos: 3 veículos, 3 motoristas e 25 lançamentos.');
