/**
 * ENVIO DE ALERTAS POR E-MAIL — módulo de Gestão de Contratos FOZTRANS
 * (Supabase). Busca alertas pendentes de envio na Edge Function
 * `alertas-email`, manda um e-mail por destinatário (agrupando tudo que essa
 * pessoa tem pendente num só e-mail) via Gmail institucional, e confirma de
 * volta ao Supabase quais IDs foram enviados (pra não reenviar amanhã).
 *
 * Independente do dashboard antigo (abas Alertas_Log/Config desta planilha):
 * usa seu próprio segredo em Propriedades do Script e seu próprio gatilho.
 *
 * COMO INSTALAR:
 * 1. Extensões → Apps Script, cole como novo arquivo (não substitua os já
 *    existentes).
 * 2. Se ainda não rodou configurarSegredo() (do SyncContratos.gs) nesta
 *    planilha, rode agora — o mesmo segredo serve para as duas funções.
 * 3. Rode instalarTriggerAlertas() uma vez para agendar o envio diário
 *    (todo dia às 7h, depois que o Supabase já registrou os alertas do dia
 *    às ~3h10 local).
 * 4. Para testar na hora, rode enviarAlertasPendentes() manualmente.
 */

// ============================================================ Config
var ALERTAS_URL_ = 'https://fuuqzyoifgmxgjfxmcxi.supabase.co/functions/v1/alertas-email';

// ============================================================ Execução manual (com aviso na tela)
function enviarAlertasPendentes() {
  var resumo = _enviarAlertasPendentes_();
  SpreadsheetApp.getUi().alert(resumo);
}

// ============================================================ Execução automática (gatilho diário, sem UI)
function enviarAlertasPendentesAutomatico() {
  var resumo = _enviarAlertasPendentes_();
  Logger.log(resumo);
}

// ============================================================ Lógica compartilhada
function _enviarAlertasPendentes_() {
  var segredo = PropertiesService.getScriptProperties().getProperty(SYNC_PROP_SEGREDO_);
  if (!segredo) {
    return 'Segredo não configurado. Rode configurarSegredo() (em SyncContratos.gs) antes de enviar alertas.';
  }

  var alertas;
  try {
    var r = UrlFetchApp.fetch(ALERTAS_URL_, {
      method: 'get',
      headers: { 'x-sync-secret': segredo },
      muteHttpExceptions: true
    });
    if (r.getResponseCode() !== 200) {
      return 'Erro ao buscar alertas (HTTP ' + r.getResponseCode() + '): ' + r.getContentText();
    }
    alertas = JSON.parse(r.getContentText()).alertas || [];
  } catch (e) {
    return 'Falha ao chamar o Supabase: ' + e.message;
  }

  if (!alertas.length) {
    return 'Nenhum alerta pendente de envio.';
  }

  // Agrupa por destinatário exato (pode já vir com vários e-mails separados
  // por vírgula — GmailApp aceita isso direto no campo "to").
  var porDestinatario = {};
  alertas.forEach(function (a) {
    var chave = a.destinatarios;
    if (!porDestinatario[chave]) porDestinatario[chave] = [];
    porDestinatario[chave].push(a);
  });

  var enviados = 0;
  var idsEnviados = [];
  var erros = [];

  Object.keys(porDestinatario).forEach(function (destinatarios) {
    var itens = porDestinatario[destinatarios];
    var assunto = 'Alertas de contratos — FOZTRANS (' + itens.length + (itens.length === 1 ? ' pendência' : ' pendências') + ')';
    var corpo = 'As pendências abaixo foram detectadas no módulo de Gestão de Contratos:\n\n' +
      itens.map(function (a) {
        var dias = a.dias;
        var prazo = dias === null ? '' : (dias < 0 ? ' (atrasado ' + Math.abs(dias) + ' dia(s))' : ' (' + dias + ' dia(s))');
        return '- ' + a.numero_ano + ' — ' + a.contratada + '\n  ' + a.motivo + prazo +
          (a.data_referencia ? ' — referência ' + a.data_referencia : '');
      }).join('\n\n') +
      '\n\n--\nMensagem automática do módulo de Gestão de Contratos FOZTRANS.';

    try {
      GmailApp.sendEmail(destinatarios, assunto, corpo);
      itens.forEach(function (a) { idsEnviados.push(a.id); });
      enviados++;
    } catch (e) {
      erros.push(destinatarios + ': ' + e.message);
    }
  });

  if (idsEnviados.length) {
    try {
      var segredoAtual = PropertiesService.getScriptProperties().getProperty(SYNC_PROP_SEGREDO_);
      var r2 = UrlFetchApp.fetch(ALERTAS_URL_, {
        method: 'post',
        contentType: 'application/json',
        headers: { 'x-sync-secret': segredoAtual },
        payload: JSON.stringify({ ids: idsEnviados }),
        muteHttpExceptions: true
      });
      if (r2.getResponseCode() !== 200) {
        erros.push('Falha ao confirmar envio ao Supabase (HTTP ' + r2.getResponseCode() + '): ' + r2.getContentText());
      }
    } catch (e) {
      erros.push('Falha ao confirmar envio ao Supabase: ' + e.message);
    }
  }

  var resumo = 'E-mails enviados: ' + enviados + ' (' + idsEnviados.length + ' alertas cobertos).';
  if (erros.length) resumo += '\n\nErros:\n' + erros.join('\n');
  return resumo;
}

// ============================================================ Gatilho diário
function instalarTriggerAlertas() {
  removerTriggerAlertas();
  ScriptApp.newTrigger('enviarAlertasPendentesAutomatico')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();
  SpreadsheetApp.getUi().alert('Envio automático diário de alertas instalado (todo dia às 7h).');
}

function removerTriggerAlertas() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'enviarAlertasPendentesAutomatico') ScriptApp.deleteTrigger(t);
  });
}
