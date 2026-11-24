/**
 * ATUALIZAÇÃO DE ÍNDICES ECONÔMICOS — módulo de Gestão de Contratos FOZTRANS
 * (Supabase). Chama a Edge Function `buscar-indices`, que busca IPCA/INPC/
 * IGP-M direto do Banco Central (SGS) e grava em `indices`. Usa o MESMO
 * segredo já configurado para sincronização/alertas — nada novo para
 * cadastrar.
 *
 * COMO INSTALAR:
 * 1. Extensões → Apps Script, cole como novo arquivo.
 * 2. Rode instalarTriggerIndices() uma vez (agenda todo dia 5 às 8h — o BCB
 *    costuma publicar os índices do mês anterior na primeira semana).
 * 3. Para testar na hora, rode atualizarIndices() manualmente.
 */

var INDICES_URL_ = 'https://fuuqzyoifgmxgjfxmcxi.supabase.co/functions/v1/buscar-indices';

function atualizarIndices() {
  var resumo = _atualizarIndices_();
  SpreadsheetApp.getUi().alert(resumo);
}

function atualizarIndicesAutomatico() {
  var resumo = _atualizarIndices_();
  Logger.log(resumo);
}

function _atualizarIndices_() {
  var segredo = PropertiesService.getScriptProperties().getProperty(SYNC_PROP_SEGREDO_);
  if (!segredo) {
    return 'Segredo não configurado. Rode configurarSegredo() (em SyncContratos.gs) antes.';
  }
  try {
    var r = UrlFetchApp.fetch(INDICES_URL_, {
      method: 'post',
      headers: { 'x-sync-secret': segredo },
      muteHttpExceptions: true
    });
    if (r.getResponseCode() !== 200) {
      return 'Erro ao atualizar índices (HTTP ' + r.getResponseCode() + '): ' + r.getContentText();
    }
    var resp = JSON.parse(r.getContentText());
    return 'Índices atualizados em ' + resp.atualizado_em + '. Total de pontos gravados: ' +
      resp.total + '.\n\nDetalhe: ' + JSON.stringify(resp.series, null, 2);
  } catch (e) {
    return 'Falha ao chamar o Supabase: ' + e.message;
  }
}

function instalarTriggerIndices() {
  removerTriggerIndices();
  ScriptApp.newTrigger('atualizarIndicesAutomatico')
    .timeBased()
    .onMonthDay(5)
    .atHour(8)
    .create();
  SpreadsheetApp.getUi().alert('Atualização mensal de índices instalada (todo dia 5 às 8h).');
}

function removerTriggerIndices() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'atualizarIndicesAutomatico') ScriptApp.deleteTrigger(t);
  });
}
