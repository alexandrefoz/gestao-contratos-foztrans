/**
 * SINCRONIZAÇÃO CONTRATOS — Sheets → Supabase (módulo de Gestão de Contratos FOZTRANS)
 *
 * COMO INSTALAR:
 * 1. Na planilha "Gestores e Fiscais de contrato v2", abra Extensões → Apps Script.
 * 2. Se já existir um projeto com outro código (ex.: o dashboard de alertas atual),
 *    cole este arquivo como um NOVO arquivo de script (+ → Script → nome
 *    "SyncContratos"), não substitua os arquivos existentes.
 * 3. Se o projeto já tiver uma função onOpen(), NÃO cole a onOpen() deste
 *    arquivo — em vez disso, adicione a linha indicada dentro da onOpen()
 *    que já existe (veja o comentário abaixo).
 * 4. Rode uma vez, manualmente, a função configurarSegredo() (edite a linha
 *    abaixo com o valor certo antes) — ela grava o segredo nas Propriedades
 *    do Script, não no código. Depois pode apagar o valor da função se quiser.
 * 5. Autorize as permissões pedidas (acesso à planilha e a URLs externas).
 * 6. Recarregue a planilha — deve aparecer o menu "Gestão de Contratos".
 */

// ============================================================ Config
var SYNC_URL_ = 'https://fuuqzyoifgmxgjfxmcxi.supabase.co/functions/v1/sync-contratos';
var SYNC_ABA_ = 'Página1';
var SYNC_PROP_SEGREDO_ = 'SYNC_SHARED_SECRET';

/**
 * RODAR UMA VEZ MANUALMENTE: troque 'COLE_O_SEGREDO_AQUI' pelo valor gerado
 * (o mesmo cadastrado em Supabase → Edge Functions → Secrets), selecione
 * esta função no editor, clique em Executar, e depois pode reverter o texto
 * se preferir não deixar no código.
 */
function configurarSegredo() {
  var segredo = 'COLE_O_SEGREDO_AQUI';
  if (segredo === 'COLE_O_SEGREDO_AQUI') {
    throw new Error('Edite configurarSegredo() com o valor real do segredo antes de rodar.');
  }
  PropertiesService.getScriptProperties().setProperty(SYNC_PROP_SEGREDO_, segredo);
  Logger.log('Segredo configurado.');
}

// ============================================================ Menu
/**
 * Se o projeto JÁ TEM uma função onOpen(), não cole esta — em vez disso,
 * adicione esta linha dentro da onOpen() existente:
 *   ui.createMenu('Gestão de Contratos').addItem('Sincronizar com Supabase', 'sincronizarContratos').addToUi();
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Gestão de Contratos')
    .addItem('Sincronizar com Supabase', 'sincronizarContratos')
    .addToUi();
}

// ============================================================ Leitura por cabeçalho
/** Lê a aba por nome de cabeçalho (não por índice) — resiste a inserir/mover coluna. */
function lerLinhasContratos_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SYNC_ABA_);
  if (!sh) throw new Error('Aba "' + SYNC_ABA_ + '" não encontrada.');
  var valores = sh.getDataRange().getDisplayValues(); // texto exibido, não o valor cru (datas/moeda já formatados)
  var cabecalhos = valores[0].map(function (h) { return String(h).trim(); });

  var linhas = [];
  for (var i = 1; i < valores.length; i++) {
    var linha = valores[i];
    // pula linha totalmente vazia
    if (linha.every(function (c) { return String(c).trim() === ''; })) continue;
    var obj = { _linha: String(i + 1) };
    cabecalhos.forEach(function (cab, j) {
      if (cab) obj[cab] = String(linha[j] || '').trim();
    });
    linhas.push(obj);
  }
  return linhas;
}

// ============================================================ Sincronização
function sincronizarContratos() {
  var ui = SpreadsheetApp.getUi();
  var segredo = PropertiesService.getScriptProperties().getProperty(SYNC_PROP_SEGREDO_);
  if (!segredo) {
    ui.alert('Segredo não configurado. Rode configurarSegredo() uma vez no editor antes de sincronizar.');
    return;
  }

  var linhas;
  try {
    linhas = lerLinhasContratos_();
  } catch (e) {
    ui.alert('Erro ao ler a planilha: ' + e.message);
    return;
  }
  if (!linhas.length) {
    ui.alert('Nenhuma linha de dado encontrada na aba "' + SYNC_ABA_ + '".');
    return;
  }

  var resposta;
  try {
    var r = UrlFetchApp.fetch(SYNC_URL_, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-sync-secret': segredo },
      payload: JSON.stringify({ linhas: linhas, usuario: Session.getActiveUser().getEmail() || 'apps_script' }),
      muteHttpExceptions: true
    });
    resposta = JSON.parse(r.getContentText());
    if (r.getResponseCode() !== 200) {
      ui.alert('Erro na sincronização (HTTP ' + r.getResponseCode() + '): ' + (resposta.erro || r.getContentText()));
      return;
    }
  } catch (e) {
    ui.alert('Falha ao chamar o Supabase: ' + e.message);
    return;
  }

  _escreverRelatorioErros(resposta.erros || []);

  var resumo = 'Sincronização concluída.\n\n' +
    'Inseridos: ' + resposta.inseridos + '\n' +
    'Alterados: ' + resposta.alterados + '\n' +
    'Rejeitados: ' + resposta.rejeitados + '\n' +
    'Lote: ' + resposta.lote_id;
  if (resposta.rejeitados > 0) {
    resumo += '\n\nVeja a aba "Sincronizacao_Erros" para o detalhe de cada linha rejeitada.';
  }
  ui.alert(resumo);
}

/** Escreve (ou limpa) a aba de relatório de erros da última sincronização. */
function _escreverRelatorioErros(erros) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Sincronizacao_Erros') || ss.insertSheet('Sincronizacao_Erros');
  sh.clear();
  sh.getRange(1, 1, 1, 3).setValues([['Linha', 'Chave (ATO Nº/ANO)', 'Motivos']])
    .setFontWeight('bold').setBackground('#cc0000').setFontColor('#ffffff');
  if (!erros.length) {
    sh.getRange(2, 1).setValue('Nenhum erro na última sincronização.');
    return;
  }
  var linhas = erros.map(function (e) {
    return [e.linha, e.chave, (e.motivos || []).join('; ')];
  });
  sh.getRange(2, 1, linhas.length, 3).setValues(linhas);
  sh.autoResizeColumns(1, 3);
}

/**
 * Opcional: rode esta função uma vez para instalar um gatilho diário
 * automático (ex.: todo dia às 6h), sem precisar clicar no menu.
 */
function instalarTriggerDiario() {
  removerTriggerDiario(); // evita duplicar se rodar de novo
  ScriptApp.newTrigger('sincronizarContratos')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();
  SpreadsheetApp.getUi().alert('Sincronização automática diária instalada (todo dia às 6h).');
}

function removerTriggerDiario() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sincronizarContratos') ScriptApp.deleteTrigger(t);
  });
}
