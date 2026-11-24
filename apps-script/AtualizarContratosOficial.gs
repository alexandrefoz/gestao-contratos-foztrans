/**
 * CORREÇÃO PONTUAL — datas/valores confirmados contra a listagem oficial de
 * contratos vigentes do FOZTRANS (arquivo "Listagem com objeto.pdf", emitido
 * 24/11/2026). Script de uso único: roda, aplica as correções de alta
 * confiança (confirmadas por nome do fornecedor nos dois documentos, sem
 * ambiguidade) e registra o "antes/depois" numa aba própria para auditoria.
 *
 * NÃO mexe em: Moving Tech (valor 30x diferente), Contrato 1/2025 (nome do
 * contratado diferente — Fernanda F Pontin x Envia), Tarobá (categoria de
 * valor não comparável), Serttel e Transdata (nome/valor a confirmar), nem nas
 * 6 Atas de Registro de Preço com prazo divergente (Licita Paraná, Sky Clean,
 * Mega Story, Damazio, Bach, EGV Soluções) — Ata tem validade legal de 1 ano
 * sem prorrogação (Lei 14.133/2021 art. 84 §4º), então a divergência pode ser
 * a ata ter vencido sem renovação, não um erro de planilha. Esses ficam para
 * o usuário decidir depois de olhar o relatório.
 *
 * COMO USAR:
 * 1. Extensões → Apps Script, cole como novo arquivo (não substitua os já
 *    existentes).
 * 2. Selecione a função aplicarCorrecoesOficiais no editor e clique Executar.
 * 3. Confirme no diálogo que aparece.
 * 4. Veja a aba "Correcoes_Aplicadas" para o detalhe de cada mudança.
 */

function aplicarCorrecoesOficiais() {
  var ui = SpreadsheetApp.getUi();
  var resposta = ui.alert(
    'Aplicar correções oficiais?',
    'Isso vai corrigir 12 datas (fim/início de vigência) e adicionar 2 ' +
      'contratos novos na aba "Página1", com base na listagem oficial de ' +
      '24/11/2026. Um relatório antes/depois será gravado na aba ' +
      '"Correcoes_Aplicadas". Confirma?',
    ui.ButtonSet.YES_NO
  );
  if (resposta !== ui.Button.YES) return;

  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Página1');
  if (!sh) { ui.alert('Aba "Página1" não encontrada.'); return; }

  var dados = sh.getDataRange().getValues();
  var cabecalhos = dados[0].map(function (h) { return String(h).trim(); });
  var idx = {};
  cabecalhos.forEach(function (h, i) { if (h) idx[h] = i; });

  var obrigatorias = ['ATO', 'Nº', 'ANO', 'INÍCIO', 'FIM'];
  var faltando = obrigatorias.filter(function (c) { return idx[c] === undefined; });
  if (faltando.length) {
    ui.alert('Colunas não encontradas: ' + faltando.join(', ') + '. Nada foi alterado.');
    return;
  }

  var colAto = idx['ATO'], colNo = idx['Nº'], colAno = idx['ANO'],
    colInicio = idx['INÍCIO'], colFim = idx['FIM'];

  // [ATO, Nº, ANO, campo, valor novo] — só CONTRATOS (não Atas de Registro de
  // Preço: essas têm validade legal de 1 ano sem prorrogação, Lei 14.133/2021
  // art. 84 §4º, então a divergência de prazo pode ser a ata ter vencido sem
  // renovação, não um erro de planilha — ficam de fora até confirmar com o
  // usuário se cada ata foi ou não prorrogada/substituída).
  var correcoes = [
    ['Contrato', '7', '2022', 'FIM', '29/11/2027'],               // SERPRO
    ['Contrato', '8', '2025', 'FIM', '19/11/2027'],               // Bortolotti (credenciamento, não é ARP)
    ['Contrato', '6', '2023', 'FIM', '25/08/2027'],               // NP Tecnologia
    ['Contrato', '6', '2024', 'FIM', '12/08/2028'],               // FEPESE
    ['Contrato', '7', '2025', 'INÍCIO', '17/11/2025'],            // CELEPAR
    ['Contrato', '3', '2026', 'INÍCIO', '24/04/2026']             // EBCP (resolve ambiguidade)
  ];

  var relatorio = [];
  correcoes.forEach(function (c) {
    var ato = c[0], numero = c[1], ano = c[2], campo = c[3], novoValor = c[4];
    var colAlvo = (campo === 'FIM') ? colFim : colInicio;
    var encontrado = false;
    for (var r = 1; r < dados.length; r++) {
      var linhaAto = String(dados[r][colAto] || '').trim();
      var linhaNo = String(dados[r][colNo] || '').trim();
      var linhaAno = String(dados[r][colAno] || '').trim();
      if (linhaAto.toLowerCase() === ato.toLowerCase() && linhaNo === numero && linhaAno === ano) {
        var valorAntigo = dados[r][colAlvo];
        sh.getRange(r + 1, colAlvo + 1).setValue(novoValor);
        relatorio.push(ato + ' ' + numero + '/' + ano + ' — ' + campo + ': "' + valorAntigo + '" → "' + novoValor + '"');
        encontrado = true;
        break;
      }
    }
    if (!encontrado) {
      relatorio.push('⚠️ NÃO ENCONTRADO (verifique manualmente): ' + ato + ' ' + numero + '/' + ano + ' — ' + campo);
    }
  });

  // Contratos que existem no oficial mas não estavam na planilha.
  // Idempotente: só adiciona se (ATO, Nº, ANO) ainda não existir — rodar o
  // script de novo não duplica linha.
  function _jaExiste(ato, numero, ano) {
    for (var r = 1; r < dados.length; r++) {
      if (String(dados[r][colAto] || '').trim().toLowerCase() === ato.toLowerCase() &&
          String(dados[r][colNo] || '').trim() === numero &&
          String(dados[r][colAno] || '').trim() === ano) {
        return true;
      }
    }
    return false;
  }

  var cabecalhoCompleto = cabecalhos.length;
  var linhasNovas = [];

  if (!_jaExiste('Contrato', '7', '2026')) {
    var linhaFaficpa = new Array(cabecalhoCompleto).fill('');
    linhaFaficpa[colAto] = 'Contrato'; linhaFaficpa[colNo] = '7'; linhaFaficpa[colAno] = '2026';
    linhaFaficpa[idx['OPCONTRATADA']] = 'FUNDACAO DE APOIO AO CAMPUS DE PARANAVAI - FAFIPA';
    linhaFaficpa[idx['OBJETO RESUMIDO']] = 'Concurso público para provimento de vagas e cadastro de reserva.';
    linhaFaficpa[idx['Valor Global']] = 'R$ 89.900,00';
    linhaFaficpa[colInicio] = '23/09/2026'; linhaFaficpa[colFim] = '22/09/2028';
    linhasNovas.push(linhaFaficpa);
    relatorio.push('+ Adicionado: Contrato 7/2026 FAFIPA (fiscal/gestor em branco — preencher manualmente)');
  } else {
    relatorio.push('= Já existia: Contrato 7/2026 FAFIPA (nada adicionado)');
  }

  if (!_jaExiste('Contrato', '8', '2026')) {
    var linhaLeiloeiro = new Array(cabecalhoCompleto).fill('');
    linhaLeiloeiro[colAto] = 'Contrato'; linhaLeiloeiro[colNo] = '8'; linhaLeiloeiro[colAno] = '2026';
    linhaLeiloeiro[idx['OPCONTRATADA']] = 'LUCIANO MARANGONI';
    linhaLeiloeiro[idx['OBJETO RESUMIDO']] = 'LEILOEIRO';
    linhaLeiloeiro[idx['Valor Global']] = 'não gera despesa';
    linhaLeiloeiro[colInicio] = '05/11/2026'; linhaLeiloeiro[colFim] = '05/11/2027';
    linhasNovas.push(linhaLeiloeiro);
    relatorio.push('+ Adicionado: Contrato 8/2026 Luciano Marangoni, leiloeiro (fiscal/gestor em branco — preencher manualmente)');
  } else {
    relatorio.push('= Já existia: Contrato 8/2026 Luciano Marangoni (nada adicionado)');
  }

  if (linhasNovas.length) {
    var proximaLinha = sh.getLastRow() + 1;
    sh.getRange(proximaLinha, 1, linhasNovas.length, cabecalhoCompleto).setValues(linhasNovas);
  }

  _escreverRelatorioCorrecoes(relatorio);
  ui.alert(
    'Correções aplicadas: ' + correcoes.length + ' campos de data atualizados, ' +
    linhasNovas.length + ' contrato(s) novo(s) adicionado(s).\n\nVeja a aba "Correcoes_Aplicadas" para o detalhe.\n\n' +
    'Pendente (não alterado, decidir depois):\n' +
    '- Moving Tech (valor 30x diferente)\n' +
    '- Contrato 1/2025 (nome do contratado diferente)\n' +
    '- Tarobá, Serttel, Transdata (nome/valor a confirmar)\n' +
    '- 6 Atas de Registro de Preço com prazo divergente (Licita Paraná, Sky ' +
    'Clean, Mega Story, Damazio, Bach, EGV Soluções) — Ata tem validade legal ' +
    'de 1 ano sem prorrogação, então confirmar caso a caso se foi renovada/' +
    'substituída antes de mudar a data.'
  );
}

function _escreverRelatorioCorrecoes(linhas) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Correcoes_Aplicadas') || ss.insertSheet('Correcoes_Aplicadas');
  sh.clear();
  sh.getRange(1, 1).setValue(
    'Aplicado em ' + new Date().toLocaleString('pt-BR') +
    ' — fonte: Listagem com objeto.pdf (oficial, emitido 24/11/2026)'
  ).setFontWeight('bold');
  var saida = linhas.map(function (l) { return [l]; });
  sh.getRange(2, 1, saida.length, 1).setValues(saida);
  sh.autoResizeColumn(1);
}
