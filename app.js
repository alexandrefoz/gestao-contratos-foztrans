import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const BUCKET_ANEXOS = 'anexos-eventos';

let tiposEvento = [];
let tipoSelecionadoId = null;
let checklistAtual = [];

let eventos = [];
let eventoAtual = null;        // registro do evento selecionado
let checklistExecAtual = [];   // linhas de checklist_exec do evento selecionado
let anexosPorItem = {};        // { checklist_exec_id: [anexo, ...] }

let contratos = [];
let contratoSelecionadoId = null;
let config = {};               // chave -> valor (DIAS_LARANJA, DIAS_AMARELO, etc.)

// ---------------------------------------------------------------- auth
async function entrar() {
  const email = document.getElementById('loginEmail').value.trim();
  const senha = document.getElementById('loginSenha').value;
  const erro = document.getElementById('loginErro');
  erro.style.display = 'none';
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    erro.textContent = '❌ ' + error.message;
    erro.style.display = 'block';
    return;
  }
  await aoLogar();
}

async function criarConta() {
  const email = document.getElementById('loginEmail').value.trim();
  const senha = document.getElementById('loginSenha').value;
  const erro = document.getElementById('loginErro');
  erro.style.display = 'none';
  if (!email || senha.length < 6) {
    erro.textContent = 'Preencha e-mail e uma senha de pelo menos 6 caracteres nos campos acima, depois clique em "criar agora".';
    erro.style.display = 'block';
    return;
  }
  const { data, error } = await supabase.auth.signUp({ email, password: senha });
  if (error) {
    erro.textContent = '❌ ' + error.message;
    erro.style.display = 'block';
    return;
  }
  if (data.session) {
    await aoLogar();
  } else {
    erro.className = 'alert alert-success py-2 small';
    erro.textContent = 'Conta criada. Se a confirmação de e-mail estiver ativa no projeto, confira sua caixa de entrada antes de entrar.';
    erro.style.display = 'block';
  }
}

async function entrarComGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
  if (error) {
    const erro = document.getElementById('loginErro');
    erro.textContent = '❌ ' + error.message + ' (provedor Google configurado no Supabase?)';
    erro.style.display = 'block';
  }
}

async function sair() {
  await supabase.auth.signOut();
  document.getElementById('app').style.display = 'none';
  document.getElementById('tela-login').style.display = 'flex';
}

async function aoLogar() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  document.getElementById('tela-login').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('userEmail').textContent = user.email;
  await carregarConfig();
  await carregarTiposEvento();
  await carregarEventos();
  await carregarContratos();
  irPara('painel');
}

// ------------------------------------------------------------ navegação
function irPara(tela) {
  document.getElementById('tela-painel').style.display = tela === 'painel' ? 'block' : 'none';
  document.getElementById('tela-contratos').style.display = tela === 'contratos' ? 'block' : 'none';
  document.getElementById('tela-eventos').style.display = tela === 'eventos' ? 'block' : 'none';
  document.getElementById('tela-tipos').style.display = tela === 'tipos' ? 'block' : 'none';
  document.getElementById('tela-checklists').style.display = tela === 'checklists' ? 'block' : 'none';
  document.querySelectorAll('#sidebar a').forEach(a => a.classList.toggle('active', a.dataset.tela === tela));
  if (tela === 'painel') renderPainel();
}

// ------------------------------------------------------------- config
async function carregarConfig() {
  const { data, error } = await supabase.from('config').select('*');
  if (error) { console.warn('Erro ao carregar config:', error.message); return; }
  config = {};
  (data || []).forEach(c => { config[c.chave] = c.valor; });
}

function diasRestantes(dataFim) {
  if (!dataFim) return null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const fim = new Date(dataFim + 'T00:00:00');
  return Math.round((fim - hoje) / 86400000);
}

function statusVigencia(dataFim) {
  const d = diasRestantes(dataFim);
  if (d === null) return { texto: 'sem data', cor: 'secondary', dias: null };
  const laranja = Number(config.DIAS_LARANJA ?? 30);
  const amarelo = Number(config.DIAS_AMARELO ?? 90);
  if (d < 0) return { texto: `vencido há ${Math.abs(d)}d`, cor: 'danger', dias: d };
  if (d <= laranja) return { texto: `${d}d restantes`, cor: 'warning', dias: d, textoCor: '#000' };
  if (d <= amarelo) return { texto: `${d}d restantes`, cor: 'info', dias: d };
  return { texto: `${d}d restantes`, cor: 'success', dias: d };
}

// --------------------------------------------------------- tipos_evento
async function carregarTiposEvento() {
  const { data, error } = await supabase
    .from('tipos_evento')
    .select('*')
    .order('rotulo');
  if (error) { alert('Erro ao carregar tipos de evento: ' + error.message); return; }
  tiposEvento = data || [];
  renderTabelaTipos();
  renderListaTiposChecklist();
  if (tiposEvento.length && !tipoSelecionadoId) {
    tipoSelecionadoId = tiposEvento[0].id;
    await carregarChecklist(tipoSelecionadoId);
  }
}

function renderTabelaTipos() {
  const tbody = document.getElementById('tbody-tipos');
  tbody.innerHTML = tiposEvento.map(t => `
    <tr>
      <td>${esc(t.rotulo)}</td>
      <td>${esc(t.instrumento)}</td>
      <td>${esc(t.regra_gatilho || '—')}</td>
      <td>${t.antecedencia_alerta_dias ?? '—'}</td>
      <td>${t.exige_parecer_juridico ? 'Sim' : 'Não'}</td>
      <td>${t.ativo ? '✅' : '—'}</td>
    </tr>
  `).join('');
}

function renderListaTiposChecklist() {
  const el = document.getElementById('lista-tipos-checklist');
  el.innerHTML = tiposEvento.map(t => `
    <a href="#" class="list-group-item list-group-item-action tipo-row ${t.id === tipoSelecionadoId ? 'active' : ''}"
       onclick="window.selecionarTipo('${t.id}');return false">
      ${esc(t.rotulo)}
    </a>
  `).join('');
}

async function selecionarTipo(id) {
  tipoSelecionadoId = id;
  renderListaTiposChecklist();
  await carregarChecklist(id);
}

// ------------------------------------------------------- checklist_modelo
async function carregarChecklist(tipoEventoId) {
  const tipo = tiposEvento.find(t => t.id === tipoEventoId);
  document.getElementById('titulo-checklist-atual').textContent = tipo ? tipo.rotulo : '—';
  const { data, error } = await supabase
    .from('checklist_modelo')
    .select('*')
    .eq('tipo_evento_id', tipoEventoId)
    .order('ordem');
  if (error) { alert('Erro ao carregar checklist: ' + error.message); return; }
  checklistAtual = data || [];
  renderChecklist();
}

function renderChecklist() {
  const tbody = document.getElementById('tbody-checklist');
  tbody.innerHTML = checklistAtual.map((e, i) => `
    <tr>
      <td class="drag-handle">⠿</td>
      <td>${e.ordem}</td>
      <td>
        <div class="fw-semibold">${esc(e.etapa)}</div>
        ${e.descricao ? `<div class="text-muted small">${esc(e.descricao)}</div>` : ''}
      </td>
      <td>${esc(e.responsavel_padrao || '—')}</td>
      <td class="small">${esc(e.fundamento || '—')}</td>
      <td>${e.exige_anexo ? '<span class="badge badge-anexo">anexo</span>' : ''}</td>
      <td>${e.bloqueante ? '<span class="badge badge-bloqueante">bloqueante</span>' : ''}</td>
      <td class="text-nowrap">
        <button class="btn btn-sm btn-link p-0 me-2" onclick="window.moverEtapa(${i},-1)" title="Mover para cima">↑</button>
        <button class="btn btn-sm btn-link p-0 me-2" onclick="window.moverEtapa(${i},1)" title="Mover para baixo">↓</button>
        <button class="btn btn-sm btn-link p-0" onclick="window.editarEtapa(${i})">Editar</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="8" class="text-muted text-center py-3">Nenhuma etapa cadastrada.</td></tr>';
}

async function moverEtapa(index, direcao) {
  const alvo = index + direcao;
  if (alvo < 0 || alvo >= checklistAtual.length) return;
  const a = checklistAtual[index], b = checklistAtual[alvo];
  const ordemA = a.ordem, ordemB = b.ordem;
  // Troca em 3 passos para não colidir com a constraint única (tipo_evento_id, ordem)
  // enquanto as duas linhas ainda não trocaram de vez.
  await trocarOrdem(a.id, -1);
  await trocarOrdem(b.id, ordemA);
  await trocarOrdem(a.id, ordemB);
  await carregarChecklist(tipoSelecionadoId);
}

async function trocarOrdem(id, novaOrdem) {
  const { error } = await supabase.from('checklist_modelo').update({ ordem: novaOrdem }).eq('id', id);
  if (error) alert('Erro ao reordenar: ' + error.message);
}

let editandoId = null;
function abrirModalEtapa() {
  editandoId = null;
  document.getElementById('eEtapa').value = '';
  document.getElementById('eDescricao').value = '';
  document.getElementById('eResponsavel').value = '';
  document.getElementById('ePrazo').value = '';
  document.getElementById('eFundamento').value = '';
  document.getElementById('eExigeAnexo').checked = false;
  document.getElementById('eBloqueante').checked = false;
  document.getElementById('btnExcluirEtapa').style.display = 'none';
  mostrarModal();
}

function editarEtapa(index) {
  const e = checklistAtual[index];
  editandoId = e.id;
  document.getElementById('eEtapa').value = e.etapa || '';
  document.getElementById('eDescricao').value = e.descricao || '';
  document.getElementById('eResponsavel').value = e.responsavel_padrao || '';
  document.getElementById('ePrazo').value = e.prazo_relativo_dias ?? '';
  document.getElementById('eFundamento').value = e.fundamento || '';
  document.getElementById('eExigeAnexo').checked = !!e.exige_anexo;
  document.getElementById('eBloqueante').checked = !!e.bloqueante;
  document.getElementById('btnExcluirEtapa').style.display = 'inline-block';
  mostrarModal();
}

function mostrarModal() {
  document.getElementById('modalEtapa').style.display = 'block';
  document.getElementById('modalEtapa').classList.add('show');
  document.getElementById('backdrop').style.display = 'block';
}
function fecharModalEtapa() {
  document.getElementById('modalEtapa').style.display = 'none';
  document.getElementById('modalEtapa').classList.remove('show');
  document.getElementById('backdrop').style.display = 'none';
}

async function salvarEtapa() {
  const payload = {
    etapa: document.getElementById('eEtapa').value.trim(),
    descricao: document.getElementById('eDescricao').value.trim() || null,
    responsavel_padrao: document.getElementById('eResponsavel').value.trim() || null,
    prazo_relativo_dias: document.getElementById('ePrazo').value ? Number(document.getElementById('ePrazo').value) : null,
    fundamento: document.getElementById('eFundamento').value.trim() || null,
    exige_anexo: document.getElementById('eExigeAnexo').checked,
    bloqueante: document.getElementById('eBloqueante').checked
  };
  if (!payload.etapa) { alert('Informe o nome da etapa.'); return; }

  if (editandoId) {
    const { error } = await supabase.from('checklist_modelo').update(payload).eq('id', editandoId);
    if (error) { alert('Erro ao salvar: ' + error.message); return; }
  } else {
    const proximaOrdem = (checklistAtual.at(-1)?.ordem || 0) + 1;
    const { error } = await supabase.from('checklist_modelo').insert({
      ...payload, tipo_evento_id: tipoSelecionadoId, ordem: proximaOrdem
    });
    if (error) { alert('Erro ao criar: ' + error.message); return; }
  }
  fecharModalEtapa();
  await carregarChecklist(tipoSelecionadoId);
}

async function excluirEtapa() {
  if (!editandoId) return;
  if (!confirm('Excluir esta etapa do checklist-modelo? Eventos já abertos não são afetados.')) return;
  const { error } = await supabase.from('checklist_modelo').delete().eq('id', editandoId);
  if (error) { alert('Erro ao excluir: ' + error.message); return; }
  fecharModalEtapa();
  await carregarChecklist(tipoSelecionadoId);
}

// ------------------------------------------------------------ contratos
async function carregarContratos() {
  const { data, error } = await supabase
    .from('contratos')
    .select('*')
    .order('vigencia_fim', { ascending: true, nullsFirst: false });
  if (error) { alert('Erro ao carregar contratos: ' + error.message); return; }
  contratos = data || [];
  renderContratos();
}

function renderContratos() {
  const busca = (document.getElementById('ctrBusca')?.value || '').toLowerCase();
  const statusFiltro = document.getElementById('ctrStatus')?.value || '';
  const filtrados = contratos.filter(c => {
    if (!c.ativo) return false; // removido da planilha-fonte — não é mais um contrato corrente
    if (statusFiltro && c.status !== statusFiltro) return false;
    if (!busca) return true;
    const alvo = `${c.numero_ano} ${c.contratada} ${c.objeto}`.toLowerCase();
    return alvo.includes(busca);
  });
  const tbody = document.getElementById('tbody-contratos');
  if (!tbody) return;
  tbody.innerHTML = filtrados.map(c => {
    const sv = statusVigencia(c.vigencia_fim);
    return `<tr style="cursor:pointer" onclick="window.selecionarContrato('${c.id}')">
      <td>${esc(c.numero_ano)}</td>
      <td class="small">${esc(c.contratada)}</td>
      <td class="small">${c.vigencia_fim ? formatarDataISO(c.vigencia_fim) : '—'}</td>
      <td><span class="badge text-bg-${sv.cor}">${sv.texto}</span></td>
    </tr>`;
  }).join('') || '<tr><td colspan="4" class="text-muted text-center py-3">Nenhum contrato encontrado.</td></tr>';
}

async function selecionarContrato(id) {
  contratoSelecionadoId = id;
  const c = contratos.find(x => x.id === id);
  if (!c) return;
  document.getElementById('ficha-vazia').style.display = 'none';
  document.getElementById('ficha-contrato').style.display = 'block';
  document.getElementById('fc-titulo').textContent = `${c.numero_ano} — ${c.contratada}`;
  document.getElementById('fc-objeto').textContent = c.objeto || '';
  const sv = statusVigencia(c.vigencia_fim);
  document.getElementById('fc-dados').innerHTML = `
    <tr><th class="small">Regime legal</th><td class="small">${esc(mapaRegime(c.regime_legal))}</td></tr>
    <tr><th class="small">Vigência</th><td class="small">${c.vigencia_inicio ? formatarDataISO(c.vigencia_inicio) : '—'} a ${c.vigencia_fim ? formatarDataISO(c.vigencia_fim) : '—'} <span class="badge text-bg-${sv.cor}">${sv.texto}</span></td></tr>
    <tr><th class="small">Valor global</th><td class="small">${formatarMoeda(c.valor_global)}</td></tr>
    <tr><th class="small">Valor mensal</th><td class="small">${c.valor_mensal ? formatarMoeda(c.valor_mensal) : '—'}</td></tr>
    <tr><th class="small">Fiscal</th><td class="small">${esc(c.fiscal_tecnico_nome || '—')}</td></tr>
    <tr><th class="small">Gestor</th><td class="small">${esc(c.gestor_nome || '—')}</td></tr>
  `;
  popularSelectTiposEvento();

  const { data, error } = await supabase
    .from('eventos')
    .select('*, tipos_evento(rotulo)')
    .eq('contrato_id', id)
    .order('data_abertura', { ascending: false });
  if (error) { document.getElementById('fc-eventos').textContent = 'Erro: ' + error.message; return; }
  document.getElementById('fc-eventos').innerHTML = (data || []).map(e => `
    <div class="small border-bottom py-1">
      <a href="#" onclick="window.irParaEvento('${e.id}');return false">${esc(e.tipos_evento?.rotulo || '—')}</a>
      — ${e.data_abertura} — <span class="badge text-bg-light text-dark border">${esc(e.status)}</span>
    </div>
  `).join('') || '<div class="text-muted small">Nenhum evento ainda neste contrato.</div>';

  await carregarCertidoes(id);

  itensTRDAtual = [];
  respostasMaoObra = {};
  document.getElementById('trdTbodyItens').innerHTML = '';
  document.getElementById('trdMoSecoes').innerHTML = '';
  atualizarCamposTRD();
}

// -------------------------------------------------------------- certidões
const TIPOS_CERTIDAO = [
  ['FGTS', 'FGTS (CRF)'],
  ['CNDT', 'CNDT (Trabalhista)'],
  ['PGFN', 'Receita Federal/PGFN'],
  ['ESTADUAL', 'Fazenda Estadual'],
  ['MUNICIPAL', 'Fazenda Municipal'],
  ['DECLARACAO_MENOR', 'Declaração art. 7º, XXXIII'],
];
const BUCKET_CERTIDOES = 'certidoes-contrato';
let certidoesPorTipo = {};

async function carregarCertidoes(contratoId) {
  const { data, error } = await supabase
    .from('certidoes_contrato')
    .select('*')
    .eq('contrato_id', contratoId);
  if (error) { document.getElementById('tbody-certidoes').innerHTML = `<tr><td colspan="5">Erro: ${esc(error.message)}</td></tr>`; return; }
  certidoesPorTipo = {};
  (data || []).forEach(c => { certidoesPorTipo[c.tipo] = c; });
  renderCertidoes();
}

function renderCertidoes() {
  const el = document.getElementById('tbody-certidoes');
  el.innerHTML = TIPOS_CERTIDAO.map(([tipo, rotulo]) => {
    const c = certidoesPorTipo[tipo];
    const sv = c?.data_validade ? statusVigencia(c.data_validade) : { texto: 'sem certidão', cor: 'secondary' };
    return `
    <tr>
      <td class="small">${esc(rotulo)}</td>
      <td><span class="badge text-bg-${sv.cor}">${sv.texto}</span></td>
      <td><input class="form-control form-control-sm" style="width:110px" value="${esc(c?.numero || '')}"
        onblur="window.salvarCertidao('${tipo}','numero',this.value)"></td>
      <td><input type="date" class="form-control form-control-sm" style="width:140px" value="${c?.data_validade || ''}"
        onchange="window.salvarCertidao('${tipo}','data_validade',this.value || null)"></td>
      <td class="small">
        ${c?.caminho_storage
          ? `📎 <a href="#" onclick="window.baixarCertidao('${tipo}');return false">${esc(c.nome_arquivo || 'arquivo')}</a>
             <a href="#" class="text-danger ms-1" onclick="window.excluirArquivoCertidao('${tipo}');return false">✕</a>`
          : `<input type="file" class="form-control form-control-sm" accept="application/pdf" style="width:160px" onchange="window.enviarCertidaoArquivo('${tipo}', this.files[0])">`}
      </td>
    </tr>`;
  }).join('');
}

async function salvarCertidao(tipo, campo, valor) {
  if (!contratoSelecionadoId) return;
  const existente = certidoesPorTipo[tipo];
  const payload = { contrato_id: contratoSelecionadoId, tipo, [campo]: valor };
  const { data, error } = await supabase
    .from('certidoes_contrato')
    .upsert(existente ? { ...existente, [campo]: valor } : payload, { onConflict: 'contrato_id,tipo' })
    .select()
    .single();
  if (error) { alert('Erro ao salvar certidão: ' + error.message); return; }
  certidoesPorTipo[tipo] = data;
  renderCertidoes();
}

async function enviarCertidaoArquivo(tipo, file) {
  if (!file || !contratoSelecionadoId) return;
  const caminho = `${contratoSelecionadoId}/${tipo}.pdf`;
  const { error: eUpload } = await supabase.storage.from(BUCKET_CERTIDOES).upload(caminho, file, { upsert: true });
  if (eUpload) { alert('Erro ao enviar arquivo: ' + eUpload.message); return; }
  await salvarCertidao(tipo, 'caminho_storage', caminho);
  await salvarCertidao(tipo, 'nome_arquivo', file.name);
}

async function baixarCertidao(tipo) {
  const c = certidoesPorTipo[tipo];
  if (!c?.caminho_storage) return;
  const { data, error } = await supabase.storage.from(BUCKET_CERTIDOES).createSignedUrl(c.caminho_storage, 60);
  if (error) { alert('Erro ao gerar link: ' + error.message); return; }
  window.open(data.signedUrl, '_blank');
}

// -------------------------------------------------------------- TRP/TRD
let itensTRDAtual = [];
let respostasMaoObra = {};

// Validado contra o template real (ANEXO_II_TRD_MO_CORRIGIDO) — art. 50 e
// art. 121 §3º da Lei 14.133/2021. Gerado dinamicamente em vez de escrito
// campo a campo no HTML (são 44 itens).
const TRD_MO_SECOES = [
  { titulo: '2.1 – A CONTRATADA forneceu cópia de:', opcoes: 4, campos: [
    ['registro_ponto', 'Registro de ponto'],
    ['salarios', 'Recibo de pagamento de salários, adicionais, horas extras, RSR e 13º'],
    ['fgts_deposito', 'Comprovante de depósito do FGTS'],
    ['ferias', 'Recibo de concessão e pagamento de férias e adicional'],
    ['quitacao_trabalhista', 'Recibo de quitação de obrigações trabalhistas/previdenciárias de dispensados'],
    ['vale_transporte', 'Recibo de pagamento de vale-transporte/vale-alimentação'],
  ]},
  { titulo: '3.1 – Condicionantes do pagamento:', opcoes: 4, campos: [
    ['caucao', 'Caução, fiança bancária ou seguro-garantia'],
    ['quitacao_obrigacoes', 'Comprovação de quitação das obrigações trabalhistas vencidas'],
    ['conta_vinculada', 'Depósito de valores em conta vinculada'],
    ['pagamento_direto', 'Pagamento direto de verbas trabalhistas em caso de inadimplemento'],
  ]},
  { titulo: '4.1 – Na ADMISSÃO, a CONTRATADA forneceu cópia de:', opcoes: 4, campos: [
    ['registro_empregado', 'Registro de empregado (CLT, art. 41)'],
    ['contrato_experiencia', 'Contrato de Experiência (CLT, art. 443)'],
    ['ctps', 'CTPS (CLT, art. 29)'],
    ['aso_admissional', 'Atestado de Saúde Ocupacional Admissional'],
    ['salario_familia', 'Termo de Responsabilidade – Salário-Família'],
    ['dependentes_ir', 'Declaração de dependentes para IR'],
    ['caged_admissao', 'CAGED – admissão'],
    ['nepotismo_adm', 'Declaração de Nepotismo'],
  ]},
  { titulo: '4.2 – Na DEMISSÃO, a CONTRATADA forneceu cópia de:', opcoes: 3, campos: [
    ['trct', 'Termo de Rescisão do Contrato de Trabalho – TRCT'],
    ['pagamento_trct', 'Comprovante de pagamento do TRCT'],
    ['aviso_previo', 'Aviso Prévio e/ou Dispensa'],
    ['aso_demissional', 'ASO Demissional'],
    ['baixa_registro', 'Baixa no Registro de empregado'],
    ['baixa_ctps', 'Baixa na CTPS'],
    ['conectividade_social', 'Comprovante movimentação conectividade social'],
    ['fgts_grrf', 'Comprovante recolhimento FGTS/GRRF rescisão'],
    ['extrato_fgts', 'Extrato FGTS para fins rescisórios'],
    ['seguro_desemprego', 'Comunicação de dispensa (Seguro-Desemprego)'],
    ['jornada_rescisao', 'Folha de Controle de Jornada do mês da rescisão'],
    ['caged_rescisao', 'CAGED – rescisão'],
  ]},
  { titulo: '4.3 – Na REALOCAÇÃO, a CONTRATADA forneceu cópia de:', opcoes: 3, campos: [
    ['declaracao_realocacao', 'Declaração de realocação sem rescisão de contrato de trabalho'],
  ]},
  { titulo: '4.4 – Na ALTERAÇÃO DE FUNÇÃO, a CONTRATADA forneceu cópia de:', opcoes: 3, campos: [
    ['ctps_funcao', 'CTPS – alteração de função'],
    ['aso_funcao', 'ASO – Alteração de Função'],
  ]},
  { titulo: '5.1 – No INÍCIO do contrato, a CONTRATADA forneceu cópia de:', opcoes: 3, campos: [
    ['formulario_terceirizados', 'Formulário de Controle de Empregados Terceirizados'],
    ['nepotismo_inicio', 'Declaração de Nepotismo'],
    ['relacao_empregados', 'Relação de empregados'],
    ['ctps_inicio', 'CTPS dos empregados e responsáveis técnicos'],
    ['declaracao_encargos', 'Declaração de responsabilidade exclusiva sobre encargos'],
  ]},
  { titulo: '5.2 – No INÍCIO do contrato, verificações:', opcoes: 3, campos: [
    ['funcao_compativel', 'Função da CTPS compatível com a exercida'],
    ['anotacoes_ctps', 'Anotações na CTPS coincidem com as fornecidas'],
    ['inicio_coincide', 'Início do contrato de trabalho coincide com exercício na Contratante'],
    ['remuneracao_compativel', 'Remuneração compatível com planilha de custos/CCT'],
    ['numero_funcionarios', 'Número de funcionários coincide com o contratado'],
    ['obrigacoes_adicionais', 'Obrigações adicionais da CCT observadas'],
  ]},
];
const OPCOES_RESPOSTA = { 4: ['sim', 'parcial', 'nao', 'na'], 3: ['sim', 'nao', 'na'] };
const ROTULO_RESPOSTA = { sim: 'Sim', parcial: 'Parcial', nao: 'Não', na: 'N/A' };

function renderSecoesMaoObra() {
  const el = document.getElementById('trdMoSecoes');
  el.innerHTML = TRD_MO_SECOES.map(sec => `
    <div class="mb-2">
      <div class="fw-semibold small">${esc(sec.titulo)}</div>
      ${sec.campos.map(([chave, rotulo]) => `
        <div class="d-flex justify-content-between align-items-center small border-bottom py-1">
          <span>${esc(rotulo)}</span>
          <select class="form-select form-select-sm w-auto" onchange="window.atualizarRespostaMaoObra('${chave}', this.value)">
            ${OPCOES_RESPOSTA[sec.opcoes].map(op => `<option value="${op}" ${respostasMaoObra[chave] === op ? 'selected' : ''}>${ROTULO_RESPOSTA[op]}</option>`).join('')}
          </select>
        </div>
      `).join('')}
    </div>
  `).join('');

  const linhasTabela = (n, campos) => Array.from({ length: n }, (_, i) => `
    <div class="row g-1 mb-1">
      ${campos.map(([id, ph, largura]) => `<div class="col-auto"><input id="${id}${i + 1}" class="form-control form-control-sm" style="width:${largura}" placeholder="${ph}"></div>`).join('')}
    </div>`).join('');
  document.getElementById('trdMoNotificacoes').innerHTML = linhasTabela(5, [
    ['trdMoNotifDesc', 'Descrição', '220px'], ['trdMoNotifData', 'Data', '110px'], ['trdMoNotifAtendeu', 'Atendeu? (Sim/Não)', '140px'],
  ]);
  document.getElementById('trdMoDocumentos').innerHTML = linhasTabela(5, [
    ['trdMoDocTipo', 'Tipo de documento', '260px'], ['trdMoDocData', 'Data', '110px'],
  ]);
}

function atualizarRespostaMaoObra(chave, valor) { respostasMaoObra[chave] = valor; }

function atualizarCamposTRD() {
  const tipo = document.getElementById('trdTipo').value;
  document.getElementById('trdColEmpenho').style.display = tipo === 'TRD3' ? '' : 'none';
  document.getElementById('trdSecaoTRD').style.display = tipo === 'TRD3' ? 'block' : 'none';
  document.getElementById('trdSecaoMaoObra').style.display = tipo === 'TRD2' ? 'block' : 'none';
  // TRD2 (mão de obra) não lista itens de serviço/material — a tela de itens
  // fica escondida, o corpo do documento é o checklist trabalhista.
  document.getElementById('trdColItens').style.display = tipo === 'TRD2' ? 'none' : '';
  if (tipo === 'TRD2' && !document.getElementById('trdMoSecoes').innerHTML) renderSecoesMaoObra();
  renderTheadTRD(tipo);
  renderTbodyTRD(tipo);
}

function renderTheadTRD(tipo) {
  document.getElementById('trdTheadItens').innerHTML = tipo === 'TRD3'
    ? '<tr><th>Seq</th><th>Descrição</th><th>Métrica</th><th>Qtd</th><th>Valor (R$)</th><th>Glosa</th></tr>'
    : '<tr><th>Descrição</th><th>Métrica</th><th>Qtd</th></tr>';
}

async function carregarItensTRD() {
  if (!contratoSelecionadoId) return;
  const { data, error } = await supabase
    .from('itens_contrato_saldo')
    .select('*')
    .eq('contrato_id', contratoSelecionadoId)
    .order('data_referencia', { ascending: false });
  if (error) { alert('Erro ao buscar itens: ' + error.message); return; }
  const maisRecente = data && data.length ? data[0].data_referencia : null;
  itensTRDAtual = (data || [])
    .filter(i => i.data_referencia === maisRecente)
    .slice(0, 10)
    .map(i => ({ ...i, valorInformado: i.valor_contratado, glosa: 0 }));
  if (!itensTRDAtual.length) {
    document.getElementById('trdTbodyItens').innerHTML = '<tr><td colspan="6" class="text-muted small">Nenhum item cadastrado pra este contrato ainda (ver seção "itens_contrato_saldo") — preencha manualmente no PDF depois de gerar, ou cadastre os itens primeiro.</td></tr>';
    return;
  }
  renderTbodyTRD(document.getElementById('trdTipo').value);
}

function renderTbodyTRD(tipo) {
  const el = document.getElementById('trdTbodyItens');
  if (!itensTRDAtual.length) return;
  el.innerHTML = itensTRDAtual.map((it, idx) => tipo === 'TRD3'
    ? `<tr>
        <td class="small">${idx + 1}</td>
        <td class="small">${esc(it.item_descricao)}</td>
        <td class="small">${esc(it.unidade || '—')}</td>
        <td class="small">${it.quantidade_contratada ?? '—'}</td>
        <td><input class="form-control form-control-sm" style="width:100px" value="${it.valorInformado}"
          onblur="window.atualizarValorItemTRD(${idx}, this.value)"></td>
        <td><input class="form-control form-control-sm" style="width:80px" value="${it.glosa}"
          onblur="window.atualizarGlosaItemTRD(${idx}, this.value)"></td>
      </tr>`
    : `<tr>
        <td class="small">${esc(it.item_descricao)}</td>
        <td class="small">${esc(it.unidade || '—')}</td>
        <td class="small">${it.quantidade_contratada ?? '—'}</td>
      </tr>`
  ).join('');
}

function atualizarValorItemTRD(idx, valor) { if (itensTRDAtual[idx]) itensTRDAtual[idx].valorInformado = Number(valor.replace(',', '.')) || 0; }
function atualizarGlosaItemTRD(idx, valor) { if (itensTRDAtual[idx]) itensTRDAtual[idx].glosa = Number(valor.replace(',', '.')) || 0; }

async function gerarTRPouTRD() {
  const c = contratos.find(x => x.id === contratoSelecionadoId);
  if (!c) return;
  const tipo = document.getElementById('trdTipo').value;
  const doc = await PDFDocument.create();
  const fonte = await doc.embedFont(StandardFonts.Helvetica);
  const fonteNeg = await doc.embedFont(StandardFonts.HelveticaBold);
  const margem = 50, largura = 595.28, altura = 841.89;
  let pagina = doc.addPage([largura, altura]);
  let y = altura - margem;

  const linha = (texto, { size = 10, negrito = false, pular = 14, cor = rgb(0, 0, 0) } = {}) => {
    if (y < margem + 20) { pagina = doc.addPage([largura, altura]); y = altura - margem; }
    for (const l of quebrarLinhas(texto, negrito ? fonteNeg : fonte, size, largura - margem * 2)) {
      pagina.drawText(l, { x: margem, y, size, font: negrito ? fonteNeg : fonte, color: cor });
      y -= pular;
    }
  };

  const titulos = {
    TRP: 'TRP - Termo de Recebimento Provisório',
    TRD3: 'TRD - Termo de Recebimento Definitivo de Bens e/ou Prestação de Serviços Comuns',
    TRD2: 'TRD - Termo de Recebimento Definitivo de Prestação de Serviços (Fornecimento de Mão de Obra)',
  };
  linha(titulos[tipo], { size: 14, negrito: true, pular: 24 });
  linha('1 - IDENTIFICAÇÃO DO CONTRATO', { negrito: true });
  linha(`Contrato: ${c.numero_ano || '—'}`);
  linha(`Vigência: ${c.vigencia_inicio ? formatarDataISO(c.vigencia_inicio) : '—'} a ${c.vigencia_fim ? formatarDataISO(c.vigencia_fim) : '—'}`);
  linha(`Contratante: FOZTRANS - Instituto de Transportes e Trânsito de Foz do Iguaçu`);
  linha(`Contratada: ${c.contratada || '—'}`);
  linha(`Ordem de Serviço: ${document.getElementById('trdOrdemServico').value || '—'}`);
  linha(`Nota Fiscal nº: ${document.getElementById('trdNotaFiscal').value || '—'}`);
  linha(`Período de referência: ${document.getElementById('trdPeriodoRef').value || '—'}`);
  if (tipo === 'TRD3') linha(`Empenho: ${document.getElementById('trdEmpenho').value || '—'}`);
  y -= 6;

  if (tipo !== 'TRD2') {
    linha('2 - DETALHAMENTO DA EXECUÇÃO DO OBJETO', { negrito: true });
    linha(`Descrição do objeto: ${c.objeto || '—'}`);
    y -= 4;
    itensTRDAtual.forEach((it, idx) => {
      if (tipo === 'TRD3') {
        linha(`${idx + 1}. ${it.item_descricao} — ${it.unidade || '—'} — Qtd: ${it.quantidade_contratada ?? '—'} — Valor: ${formatarMoeda(it.valorInformado)}${it.glosa ? ` — Glosa: ${formatarMoeda(it.glosa)}` : ''}`);
      } else {
        linha(`- ${it.item_descricao} — ${it.unidade || '—'} — Qtd: ${it.quantidade_contratada ?? '—'}`);
      }
    });
    y -= 6;
  }

  if (tipo === 'TRD2') {
    linha('2 - REGULARIDADE EM RELAÇÃO ÀS OBRIGAÇÕES TRABALHISTAS E SOCIAIS (Art. 50, Lei nº 14.133/2021)', { negrito: true });
    linha('3 - MEDIDAS PARA ASSEGURAR O CUMPRIMENTO DE OBRIGAÇÕES TRABALHISTAS (Art. 121, §3º, Lei nº 14.133/2021)', { negrito: true });
    TRD_MO_SECOES.forEach(sec => {
      linha(sec.titulo, { negrito: true });
      sec.campos.forEach(([chave, rotulo]) => {
        linha(`${rotulo}: ${ROTULO_RESPOSTA[respostasMaoObra[chave] || 'na']}`);
      });
      y -= 4;
    });

    linha('3.2 CONDIÇÕES DE HABILITAÇÃO JURÍDICA', { negrito: true });
    const respGeral = { sim: 'Sim', nao: 'Não', na: 'N/A' };
    linha(`Mantém regularidade fiscal/trabalhista e inc. XXXIII art. 7º CF/88? ${respGeral[document.getElementById('trdMoHabGeral').value]}`);
    linha('Documentação:', { negrito: true });
    const { data: certidoesMo } = await supabase.from('certidoes_contrato').select('*').eq('contrato_id', c.id);
    const porTipoMo = {}; (certidoesMo || []).forEach(x => { porTipoMo[x.tipo] = x; });
    [['PGFN', 'Certidão Conjunta Receita Federal/PGFN'], ['ESTADUAL', 'Certidão Regularidade Fazenda Estadual'],
     ['MUNICIPAL', 'Certidão Regularidade Fazenda Municipal'], ['FGTS', 'Certidão Regularidade FGTS (CRF)'],
     ['CNDT', 'Certidão Débitos Trabalhistas (CNDT)'], ['DECLARACAO_MENOR', 'Declaração art. 7º, XXXIII, CF/88']].forEach(([t, rotulo]) => {
      const cert = porTipoMo[t];
      linha(`${rotulo}: nº ${cert?.numero || '—'} — validade ${cert?.data_validade ? formatarDataISO(cert.data_validade) : '—'}`);
    });
    y -= 6;

    linha('6 - REGULARIDADE TRABALHISTA: TÉRMINO DO CONTRATO (quando aplicável, mesma documentação da seção 4.2)', { negrito: true });
    const obsSec6 = document.getElementById('trdMoObsSec6').value;
    if (obsSec6) linha(`Obs.: ${obsSec6}`);
    y -= 4;

    linha('7 - NOTIFICAÇÕES REALIZADAS NO PERÍODO', { negrito: true });
    let temNotif = false;
    for (let i = 1; i <= 5; i++) {
      const desc = document.getElementById(`trdMoNotifDesc${i}`)?.value;
      if (!desc) continue;
      temNotif = true;
      const data = document.getElementById(`trdMoNotifData${i}`)?.value || '—';
      const atendeu = document.getElementById(`trdMoNotifAtendeu${i}`)?.value || '—';
      linha(`${i}. ${desc} — ${data} — Atendeu: ${atendeu}`);
    }
    if (!temNotif) linha('Nenhuma notificação registrada no período.');
    y -= 4;

    linha('8 - JUNTADA DE DOCUMENTOS COMPROBATÓRIOS', { negrito: true });
    let temDoc = false;
    for (let i = 1; i <= 5; i++) {
      const tipoDoc = document.getElementById(`trdMoDocTipo${i}`)?.value;
      if (!tipoDoc) continue;
      temDoc = true;
      const data = document.getElementById(`trdMoDocData${i}`)?.value || '—';
      linha(`${i}. ${tipoDoc} — ${data}`);
    }
    if (!temDoc) linha('Nenhum documento adicional juntado.');
    y -= 6;
  }

  if (tipo === 'TRD3') {
    const conf = { sim: 'Sim', parcial: 'Parcialmente', nao: 'Não' }[document.getElementById('trdConformidade').value];
    linha(`A parcela executada está de acordo com o Contrato/Edital/TR? ${conf}`, { negrito: true });
    y -= 6;

    linha('3 - MANUTENÇÃO DAS CONDIÇÕES DE HABILITAÇÃO, QUALIFICAÇÃO E REGULARIDADE FISCAL E TRABALHISTA', { negrito: true });
    const resp = { sim: 'Sim', nao: 'Não', na: 'N/A' };
    linha(`3.1 Mantém habilitação/qualificação exigida (Art. 3º, V, IN nº 7/2026)? ${resp[document.getElementById('trdHab1').value]}`);
    linha(`3.2 Mantém regularidade fiscal/trabalhista e inc. XXXIII art. 7º CF/88? ${resp[document.getElementById('trdHab2').value]}`);
    const obsHab = document.getElementById('trdObsHab').value;
    if (obsHab) linha(`Obs.: ${obsHab}`);
    y -= 4;

    linha('Documentação:', { negrito: true });
    const { data: certidoes } = await supabase.from('certidoes_contrato').select('*').eq('contrato_id', c.id);
    const porTipo = {}; (certidoes || []).forEach(x => { porTipo[x.tipo] = x; });
    [['PGFN', 'Certidão Conjunta Receita Federal/PGFN'], ['ESTADUAL', 'Certidão Regularidade Fazenda Estadual'],
     ['MUNICIPAL', 'Certidão Regularidade Fazenda Municipal'], ['FGTS', 'Certidão Regularidade FGTS (CRF)'],
     ['CNDT', 'Certidão Débitos Trabalhistas (CNDT)']].forEach(([t, rotulo]) => {
      const cert = porTipo[t];
      linha(`${rotulo}: nº ${cert?.numero || '—'} — validade ${cert?.data_validade ? formatarDataISO(cert.data_validade) : '—'}`);
    });
    y -= 6;
  }

  linha(`Por este instrumento, atestamos, para fins de cumprimento do disposto no art. ${tipo === 'TRP' ? '2º' : '3º'} da Instrução Normativa nº 7/2026, que os ${tipo === 'TRP' ? 'bens e/ou serviços acima identificados, foram recebidos provisoriamente' : 'bens e/ou serviços acima identificados, foram recebidos definitivamente'} na presente data${tipo === 'TRP' ? ', e serão objeto de avaliação quanto à adequação da entrega às condições contratuais' : ', em conformidade com os requisitos contratuais'}.`);
  y -= 20;
  const dataTermo = document.getElementById('trdDataTermo').value;
  linha(`Foz do Iguaçu, ${dataTermo ? formatarDataISO(dataTermo) : new Date().toLocaleDateString('pt-BR')}`);
  y -= 30;
  linha('Assinatura: ______________________________');
  linha(`Nome: ${c.fiscal_tecnico_nome || '—'}`);
  linha('Qualificação: Fiscal do Contrato/Comissão de Recebimento');
  y -= 10;
  linha('Assinatura: ______________________________');
  linha(`Nome: ${c.gestor_nome || '—'}`);
  linha('Qualificação: Gestor do Contrato');

  const fonteRodape = await doc.embedFont(StandardFonts.Helvetica);
  doc.getPages().forEach((p, i) => {
    p.drawText(`${i + 1} / ${doc.getPageCount()}`, { x: largura - margem - 40, y: 20, size: 9, font: fonteRodape, color: rgb(.4, .4, .4) });
  });

  const bytes = await doc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tipo}_${(c.numero_ano || 'contrato').replace(/\W+/g, '_')}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

async function excluirArquivoCertidao(tipo) {
  const c = certidoesPorTipo[tipo];
  if (!c?.caminho_storage) return;
  if (!confirm('Excluir o arquivo desta certidão?')) return;
  const { error } = await supabase.storage.from(BUCKET_CERTIDOES).remove([c.caminho_storage]);
  if (error) { alert('Erro ao excluir: ' + error.message); return; }
  await salvarCertidao(tipo, 'caminho_storage', null);
  await salvarCertidao(tipo, 'nome_arquivo', null);
}

function popularSelectTiposEvento() {
  const sel = document.getElementById('fcTipoEvento');
  if (!sel) return;
  sel.innerHTML = tiposEvento.map(t => `<option value="${t.id}">${esc(t.rotulo)}</option>`).join('');
}

async function abrirEventoNoContrato() {
  const tipoId = document.getElementById('fcTipoEvento').value;
  if (!contratoSelecionadoId || !tipoId) return;
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase.rpc('abrir_evento', {
    p_contrato_id: contratoSelecionadoId,
    p_tipo_evento_id: tipoId,
    p_processo_adm_id: null,
    p_data_limite: null,
    p_responsavel_email: userData?.user?.email || null
  });
  if (error) { alert('Erro ao abrir evento: ' + error.message); return; }
  await carregarEventos();
  irPara('eventos');
  await selecionarEvento(data);
}

async function irParaEvento(eventoId) {
  await carregarEventos();
  irPara('eventos');
  await selecionarEvento(eventoId);
}

function mapaRegime(r) {
  if (r === 'lei_14133_2021') return 'Lei 14.133/2021';
  if (r === 'lei_8666_1993') return 'Lei 8.666/1993';
  return '[A CONFIRMAR]';
}
function formatarDataISO(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function formatarMoeda(v) {
  if (v === null || v === undefined) return '—';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// -------------------------------------------------------------- painel
let painelFiltroMax = null;    // null = sem filtro de dias; número = mostra só dias_restantes <= isso
let painelFiltroLabel = '';

async function renderPainel() {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const laranja = Number(config.DIAS_LARANJA ?? 30);
  const amarelo = Number(config.DIAS_AMARELO ?? 90);

  const ativos = contratos.filter(c => c.status === 'ativo' && c.ativo);
  const criticos = ativos.filter(c => { const d = diasRestantes(c.vigencia_fim); return d !== null && d <= laranja; });
  const atencao = ativos.filter(c => { const d = diasRestantes(c.vigencia_fim); return d !== null && d > laranja && d <= amarelo; });
  const eventosAbertos = eventos.filter(e => e.status === 'aberto' || e.status === 'em_andamento');

  const { data: atrasadas, error: eAtr } = await supabase
    .from('checklist_exec')
    .select('*, eventos(id, contratos(numero_ano, contratada), tipos_evento(rotulo))')
    .lt('prazo_previsto', hoje.toISOString().slice(0, 10))
    .in('status', ['pendente', 'em_andamento']);
  if (eAtr) console.warn('Erro ao buscar etapas atrasadas:', eAtr.message);
  painelAtrasadasCache = atrasadas || [];

  // Cada card é clicável: filtra a tabela "Próximos vencimentos" abaixo
  // (ou navega para a tela correspondente, quando não faz sentido filtrar
  // uma lista de contratos — eventos/etapas atrasadas).
  document.getElementById('painel-cards').innerHTML = [
    ['Contratos ativos', ativos.length, 'primary', `window.filtrarPainel(null, 'Contratos ativos')`],
    [`Vencendo em até ${laranja}d`, criticos.length, 'danger', `window.filtrarPainel(${laranja}, 'Vencendo em até ${laranja} dias')`],
    [`Vencendo em até ${amarelo}d`, atencao.length, 'warning', `window.filtrarPainel(${amarelo}, 'Vencendo em até ${amarelo} dias')`],
    ['Eventos em andamento', eventosAbertos.length, 'info', `window.irPara('eventos')`],
    ['Etapas atrasadas', (atrasadas || []).length, 'dark', `document.getElementById('painel-providencias').scrollIntoView({behavior:'smooth'})`]
  ].map(([titulo, valor, cor, aoClicar]) => `
    <div class="col">
      <div class="card border-${cor}" style="cursor:pointer" onclick="${aoClicar}">
        <div class="card-body py-2 text-center">
          <div class="fs-4 fw-bold text-${cor}">${valor}</div>
          <div class="small text-muted">${titulo}</div>
        </div>
      </div>
    </div>
  `).join('');

  const provid = [];
  (atrasadas || []).forEach(a => {
    provid.push(`<div class="alert alert-danger py-2 small mb-1">
      Etapa atrasada: <b>${esc(a.etapa)}</b> — ${esc(a.eventos?.contratos?.numero_ano || '—')}
      (${esc(a.eventos?.tipos_evento?.rotulo || '—')}) — prazo era ${formatarDataISO(a.prazo_previsto)}
    </div>`);
  });
  eventosAbertos.filter(e => !e.responsavel_email).forEach(e => {
    provid.push(`<div class="alert alert-warning py-2 small mb-1">Evento sem responsável definido (ID ${e.id.slice(0, 8)})</div>`);
  });
  document.getElementById('painel-providencias').innerHTML = provid.join('') || '<div class="text-muted small">Nenhuma providência pendente no momento.</div>';

  renderPainelVencimentos();
}

let painelAtrasadasCache = [];

function filtrarPainel(diasMax, rotulo) {
  painelFiltroMax = diasMax;
  painelFiltroLabel = rotulo;
  renderPainelVencimentos();
}

function renderPainelVencimentos() {
  let lista = contratos.filter(c => c.status === 'ativo' && c.ativo && c.vigencia_fim);
  if (painelFiltroMax !== null) {
    lista = lista.filter(c => { const d = diasRestantes(c.vigencia_fim); return d !== null && d <= painelFiltroMax; });
  } else {
    lista = lista.slice(0, 15);
  }

  const titulo = document.getElementById('painel-vencimentos-titulo');
  if (titulo) {
    titulo.innerHTML = painelFiltroLabel
      ? `📅 ${esc(painelFiltroLabel)} <button class="btn btn-sm btn-link p-0" onclick="window.filtrarPainel(null,'')">(limpar filtro)</button>`
      : '📅 Próximos vencimentos';
  }

  document.getElementById('painel-vencimentos').innerHTML = lista.map(c => {
    const sv = statusVigencia(c.vigencia_fim);
    return `<tr style="cursor:pointer" onclick="window.irPara('contratos');window.selecionarContrato('${c.id}')">
      <td>${esc(c.numero_ano)}</td><td class="small">${esc(c.contratada)}</td>
      <td class="small">${formatarDataISO(c.vigencia_fim)}</td>
      <td><span class="badge text-bg-${sv.cor}">${sv.texto}</span></td>
    </tr>`;
  }).join('') || '<tr><td colspan="4" class="text-muted text-center py-3">Nenhum contrato nessa condição.</td></tr>';
}

// ------------------------------------------------------------- eventos
async function carregarEventos() {
  const { data, error } = await supabase
    .from('eventos')
    .select('*, contratos(numero_ano, contratada, objeto, cnpj, valor_global, valor_mensal, data_base_reajuste, indice_reajuste, regime_legal), tipos_evento(rotulo, tipo)')
    .order('data_abertura', { ascending: false })
    .limit(50);
  if (error) { alert('Erro ao carregar eventos: ' + error.message); return; }
  eventos = data || [];
  renderListaEventos();
  if (eventos.length && !eventoAtual) await selecionarEvento(eventos[0].id);
}

function renderListaEventos() {
  const el = document.getElementById('lista-eventos');
  el.innerHTML = eventos.map(e => `
    <a href="#" class="list-group-item list-group-item-action ${eventoAtual?.id === e.id ? 'active' : ''}"
       onclick="window.selecionarEvento('${e.id}');return false">
      <div class="fw-semibold small">${esc(e.contratos?.numero_ano || '—')} — ${esc(e.tipos_evento?.rotulo || '—')}</div>
      <div class="text-muted" style="font-size:11px">${esc(e.contratos?.contratada || '')} · ${esc(e.status)}</div>
    </a>
  `).join('') || '<div class="text-muted small p-2">Nenhum evento aberto ainda.</div>';
}

async function selecionarEvento(id) {
  eventoAtual = eventos.find(e => e.id === id);
  renderListaEventos();
  document.getElementById('evento-vazio').style.display = 'none';
  document.getElementById('evento-detalhe').style.display = 'block';
  document.getElementById('dossieAviso').style.display = 'none';
  document.getElementById('ev-titulo').textContent =
    `${eventoAtual.contratos?.numero_ano || '—'} — ${eventoAtual.tipos_evento?.rotulo || '—'}`;
  document.getElementById('ev-subtitulo').textContent =
    `${eventoAtual.contratos?.contratada || '—'} · ${eventoAtual.contratos?.objeto || ''}`;

  const cardReajuste = document.getElementById('cardReajuste');
  if (eventoAtual.tipos_evento?.tipo === 'reajuste') {
    cardReajuste.style.display = 'block';
    document.getElementById('reajusteResultado').innerHTML = '';
    const c = eventoAtual.contratos || {};
    document.getElementById('reajusteDataBase').value = c.data_base_reajuste || '';
    document.getElementById('reajusteDataRef').value = new Date().toISOString().slice(0, 10);
    if (c.indice_reajuste && ['IPCA', 'INPC', 'IGPM'].includes(c.indice_reajuste.toUpperCase())) {
      document.getElementById('reajusteIndice').value = c.indice_reajuste.toUpperCase();
    }
  } else {
    cardReajuste.style.display = 'none';
  }

  const { data, error } = await supabase
    .from('checklist_exec')
    .select('*, checklist_modelo(chave_modelo)')
    .eq('evento_id', id)
    .order('ordem');
  if (error) { alert('Erro ao carregar checklist do evento: ' + error.message); return; }
  checklistExecAtual = data || [];

  const ids = checklistExecAtual.map(c => c.id);
  anexosPorItem = {};
  if (ids.length) {
    const { data: anexos, error: eAnexos } = await supabase
      .from('anexos')
      .select('*')
      .in('checklist_exec_id', ids)
      .order('ordem');
    if (eAnexos) { alert('Erro ao carregar anexos: ' + eAnexos.message); }
    (anexos || []).forEach(a => {
      (anexosPorItem[a.checklist_exec_id] ||= []).push(a);
    });
  }
  renderChecklistExec();
}

function renderChecklistExec() {
  const total = checklistExecAtual.length;
  const concluidas = checklistExecAtual.filter(c => c.status === 'concluida' || c.status === 'nao_se_aplica').length;
  document.getElementById('ev-progresso').textContent = total ? `${concluidas}/${total} etapas concluídas` : '—';

  const el = document.getElementById('lista-checklist-exec');
  el.innerHTML = checklistExecAtual.map(c => {
    const anexos = anexosPorItem[c.id] || [];
    const chaveModelo = c.checklist_modelo?.chave_modelo;
    return `
    <div class="card mb-2">
      <div class="card-body py-2">
        <div class="d-flex justify-content-between align-items-start">
          <div class="fw-semibold">${c.ordem}. ${esc(c.etapa)} ${c.bloqueante ? '<span class="badge badge-bloqueante">bloqueante</span>' : ''} ${c.exige_anexo ? '<span class="badge badge-anexo">exige anexo</span>' : ''} ${chaveModelo && GERADORES_TEXTO[chaveModelo] ? `<button class="btn btn-sm btn-outline-primary py-0 px-1" style="font-size:11px" onclick="window.gerarTextoEtapa('${chaveModelo}')" title="Gerar texto padrão desta etapa">📄 gerar texto</button>` : ''}</div>
          <select class="form-select form-select-sm w-auto" onchange="window.atualizarCampoExec('${c.id}','status',this.value)">
            ${['pendente','em_andamento','concluida','nao_se_aplica'].map(s =>
              `<option value="${s}" ${c.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join('')}
          </select>
        </div>
        ${c.descricao ? `<div class="text-muted small mb-1">${esc(c.descricao)}</div>` : ''}
        <div class="row g-2 mt-1">
          <div class="col-md-6">
            <label class="form-label small mb-0">Responsável</label>
            <input class="form-control form-control-sm" value="${esc(c.responsavel || '')}" placeholder="${esc(c.responsavel_padrao||'')}"
              onblur="window.atualizarCampoExec('${c.id}','responsavel',this.value)">
          </div>
          <div class="col-md-6">
            <label class="form-label small mb-0">Data de conclusão</label>
            <input type="date" class="form-control form-control-sm" value="${c.data_conclusao || ''}"
              onchange="window.atualizarCampoExec('${c.id}','data_conclusao',this.value || null)">
          </div>
        </div>
        <label class="form-label small mb-0 mt-2">Justificativa / manifestação (vai para o relatório)</label>
        <textarea class="form-control form-control-sm" rows="2"
          onblur="window.atualizarCampoExec('${c.id}','texto_justificativa',this.value)">${esc(c.texto_justificativa || '')}</textarea>

        <div class="mt-2">
          <label class="form-label small mb-1">Anexos</label>
          <div class="d-flex flex-wrap gap-2 mb-1" id="anexos-${c.id}">
            ${anexos.map((a, i) => `
              <span class="badge bg-light text-dark border">
                📎 ${esc(a.nome_arquivo)}
                <a href="#" onclick="window.baixarAnexo('${a.id}');return false" title="Baixar">⬇</a>
                <a href="#" onclick="window.excluirAnexo('${a.id}','${c.id}');return false" title="Excluir" class="text-danger">✕</a>
              </span>
            `).join('') || '<span class="text-muted small">nenhum anexo ainda</span>'}
          </div>
          <input type="file" class="form-control form-control-sm" multiple
            onchange="window.enviarAnexos('${c.id}', this.files)">
        </div>
      </div>
    </div>
  `;
  }).join('') || '<div class="text-muted">Este evento não tem etapas no checklist.</div>';
}

// -------------------------------------------------------------- textos padrão
// Fundamentação validada contra processo real (Moving Tech, processo 42.026/2026)
// só existe para "reajuste". Para os demais tipos, deixa marcado para revisão —
// não inventa artigo/decreto que não foi conferido.
const JUSTIFICATIVA_POR_TIPO = {
  reajuste: (c) => `O Contrato nº ${c.numero_ano || '[CONTRATO]'}, firmado com a empresa ${c.contratada || '[CONTRATADA]'}, atingiu o interregno mínimo de 12 (doze) meses desde a última data-base, ensejando o reajuste dos valores contratados.\n\nA concessão de ofício é competência do gestor do contrato, nos termos do Decreto Municipal nº 32.398/2024 (art. 290 e art. 303, inciso X).\n\nA adoção proativa dessa medida preserva o equilíbrio econômico-financeiro da avença e afasta o risco de futuros pedidos de reequilíbrio por defasagem inflacionária acumulada.`,

  // Validado contra processo real (Dataprom, Parecer Técnico de Prorrogação
  // Parcial, Contrato 004/2025) — fundamento varia pelo regime legal do
  // contrato, por isso ramifica em c.regime_legal.
  prorrogacao: (c) => {
    if (c.regime_legal === 'lei_14133_2021') {
      return `O Contrato nº ${c.numero_ano || '[CONTRATO]'}, firmado com a empresa ${c.contratada || '[CONTRATADA]'}, tem por objeto ${c.objeto || '[OBJETO]'}, caracterizando-se como serviço/fornecimento contínuo nos termos do art. 6º, inciso XV, da Lei nº 14.133/2021.\n\nNos termos do art. 107 da Lei nº 14.133/2021, os contratos de serviços e fornecimentos contínuos poderão ser prorrogados sucessivamente, respeitada a vigência máxima decenal, desde que a autoridade competente ateste que as condições e os preços permanecem vantajosos para a Administração.\n\n[Confirmar aqui a vantajosidade de preços atual e, se a contratação original foi por inexigibilidade/dispensa, a persistência da condição que a motivou.]`;
    }
    if (c.regime_legal === 'lei_8666_1993') {
      return `O Contrato nº ${c.numero_ano || '[CONTRATO]'}, firmado com a empresa ${c.contratada || '[CONTRATADA]'}, tem por objeto ${c.objeto || '[OBJETO]'}, caracterizando-se como serviço contínuo.\n\nNos termos do art. 57, inciso II, da Lei nº 8.666/1993, os contratos de serviços a serem executados de forma contínua poderão ter a sua duração prorrogada por iguais e sucessivos períodos, com vistas à obtenção de preços e condições mais vantajosas para a Administração, limitada a sessenta meses.\n\n[Conferir a cláusula específica do contrato que lista os requisitos para prorrogação — costuma reproduzir os critérios do TCU (ex.: preços e condições vantajosos, interesse da Administração, previsão em edital).]`;
    }
    return `O Contrato nº ${c.numero_ano || '[CONTRATO]'}, firmado com a empresa ${c.contratada || '[CONTRATADA]'}, tem por objeto ${c.objeto || '[OBJETO]'}.\n\n[Regime legal do contrato não identificado no cadastro — confirmar se é Lei 14.133/2021 (art. 107) ou Lei 8.666/1993 (art. 57, II) antes de prosseguir, o fundamento muda conforme o caso.]`;
  },

  // Validado contra processo real (Liderança, 1º Apostilamento, Processo
  // 62.368/2024) — repactuação é CCT-driven, com retroatividade à data de
  // início de execução do contrato. O valor em si (percentual salarial,
  // auxílios) depende do acordo/convenção coletiva vigente — não é
  // calculado automaticamente (módulo de cálculo retroativo ainda não
  // construído), só a fundamentação legal.
  repactuacao: (c) => `O Contrato nº ${c.numero_ano || '[CONTRATO]'}, firmado com a empresa ${c.contratada || '[CONTRATADA]'}, é executado com regime de dedicação exclusiva de mão de obra, sujeito à repactuação nos termos do art. 6º, inciso LIX, da Lei nº 14.133/2021.\n\nA repactuação decorre de nova Convenção/Acordo Coletivo de Trabalho da categoria, com efeitos retroativos à data de início da execução do contrato (ou à data-base anterior, conforme o caso).\n\n[Confirmar: número e data da CCT/ACT aplicável, percentual de reajuste salarial e valores de benefícios (ex.: auxílio alimentação) pactuados, e a data-base/retroatividade correta para este contrato — não calculado automaticamente, módulo de cálculo retroativo de repactuação ainda não construído.]`,
};
const FINALIDADE_POR_TIPO = {
  reajuste: 'o processamento de reajuste contratual',
  prorrogacao: 'o processamento de prorrogação do prazo de vigência contratual',
  repactuacao: 'o processamento de repactuação contratual',
  revisao_reequilibrio: 'o processamento de revisão/reequilíbrio econômico-financeiro do contrato',
  apostilamento_generico: 'o processamento de apostilamento contratual',
  aditivo_generico: 'o processamento de termo aditivo contratual',
};

function _textoMemorandoAbertura(c, tipo, rotulo) {
  const finalidade = FINALIDADE_POR_TIPO[tipo] || 'o processamento do presente evento contratual';
  const justificativa = JUSTIFICATIVA_POR_TIPO[tipo]
    ? JUSTIFICATIVA_POR_TIPO[tipo](c)
    : `[Descrever aqui a necessidade e fundamentação legal específica deste evento — tipo "${rotulo || tipo}" ainda não tem modelo de texto validado contra processo real. Não preencher de forma automática.]`;
  return `MEMORANDO INTERNO\n` +
    `Destinatário: FOZTRANS - SUPERINTENDÊNCIA; FOZTRANS / DAF - DIRETORIA ADMINISTRATIVA E FINANCEIRA.\n` +
    `Assunto: ABERTURA DE PROCESSO ADMINISTRATIVO - ${(rotulo || '').toUpperCase()} CONTRATO N.º ${c.numero_ano || '[CONTRATO]'} - ${c.contratada || '[CONTRATADA]'}\n` +
    `Data: ${new Date().toLocaleDateString('pt-BR')}\n\n` +
    `Prezado Diretor Superintendente,\n\n` +
    `1. DA NECESSIDADE E FUNDAMENTAÇÃO\n${justificativa}\n\n` +
    `2. DA SOLICITAÇÃO\n` +
    `Na qualidade de Gestor do Contrato, solicito autorização para abertura do processo administrativo de ${finalidade}, para os trâmites internos.\n\n` +
    `Atenciosamente,`;
}

function _textoAutorizacao(c, tipo) {
  const finalidade = FINALIDADE_POR_TIPO[tipo] || 'o processamento do presente evento contratual';
  return `Fica autorizada a abertura e instrução de processo administrativo vinculado ao Contrato nº ${c.numero_ano || '[CONTRATO]'}, que tem como objeto ${c.objeto || '[OBJETO]'}, que será prestado nas condições estabelecidas no Termo de Referência, e como contratada a empresa ${c.contratada || '[CONTRATADA]'}${c.cnpj ? ', CNPJ: ' + c.cnpj : ''}, visando ${finalidade}.\n\nFoz do Iguaçu – PR, ${new Date().toLocaleDateString('pt-BR')}.`;
}

function _textoDespachoDAF(c, tipo, rotulo) {
  return `PREZADO GESTOR,\n\n` +
    `SOLICITO QUE DÊ CONTINUIDADE À FORMULAÇÃO DO ${(rotulo || 'EVENTO').toUpperCase()} CONTRATUAL, COM A DEVIDA ANÁLISE TÉCNICA A SER REALIZADA PELA DIVISÃO DE LICITAÇÕES (TERMO) E PELA CONTABILIDADE (PARECER TÉCNICO, QUANDO APLICÁVEL).\n\n` +
    `DETERMINO, AINDA, QUE TODA A TRAMITAÇÃO SEJA REALIZADA VIA MÓDULO PROCESSO DIGITAL, NO SISTEMA OXY.\n\n` +
    `ATENCIOSAMENTE,`;
}

function _textoSolicitacaoContabilidade(c, tipo) {
  if (tipo !== 'reajuste') {
    return `Prezado Contador.\n\nSolicito a elaboração de memória de cálculo para fins de instrução do processo de ${FINALIDADE_POR_TIPO[tipo] || 'evento contratual'} do Contrato nº ${c.numero_ano || '[CONTRATO]'}, firmado com a empresa ${c.contratada || '[CONTRATADA]'}, cujo objeto é ${c.objeto || '[OBJETO]'}.\n\n[Descrever aqui o que exatamente precisa ser calculado — modelo ainda não validado contra processo real para este tipo de evento.]\n\nSem mais,`;
  }
  return `Prezado Contador.\n\n` +
    `Solicito a elaboração de memória de cálculo para fins de instrução do processo de reajuste anual do Contrato nº ${c.numero_ano || '[CONTRATO]'}, firmado com a empresa ${c.contratada || '[CONTRATADA]'}, cujo objeto é ${c.objeto || '[OBJETO]'}.\n\n` +
    `Com base na Cláusula de reajuste do contrato, solicito:\n` +
    `a) Variação do índice aplicável: apuração do índice acumulado no período correspondente;\n` +
    `b) Atualização dos valores: aplicação do índice sobre os preços unitários vigentes.\n\n` +
    `Sem mais,`;
}

function _textoTermoApostilamento(c, tipo) {
  if (tipo !== 'reajuste') {
    return `[Modelo de Termo de Apostilamento ainda não construído para o tipo "${tipo}" — só validado para reajuste até agora. Use o texto do(s) processo(s) reais como referência.]`;
  }
  if (!memoriaReajusteAtual) {
    return '[Calcule o reajuste no card "Cálculo de reajuste" acima primeiro — o termo usa o percentual e a tabela de itens de lá.]';
  }
  const m = memoriaReajusteAtual;
  const percentual = ((m.fatorFinal - 1) * 100).toFixed(4).replace('.', ',');
  const hoje = new Date();
  const periodoIni = m.dataBase.split('-').reverse().join('/');
  const periodoFim = m.dataRef.split('-').reverse().join('/');

  let tabela;
  if (m.modo === 'itens') {
    tabela = m.itens.map(it =>
      `${it.item} — ${it.item_descricao}: de ${formatarMoeda(it.valor_unitario)} para ${formatarMoeda(it.valorUnitarioNovo)}`
    ).join('\n');
  } else {
    tabela = `Valor de R$ ${formatarMoeda(m.base)} para ${formatarMoeda(m.valorNovo)}`;
  }

  return `TERMO DE APOSTILAMENTO\n\n` +
    `Ao CONTRATO Nº ${c.numero_ano || '[CONTRATO]'}, celebrado entre o FOZTRANS e a ${c.contratada || '[CONTRATADA]'}, que tem por objeto ${c.objeto || '[OBJETO]'}.\n\n` +
    `O FOZTRANS - Instituto de Transportes Trânsito de Foz do Iguaçu, autarquia pública, com sede na cidade de Foz do Iguaçu, na Rua Edgard Schimmelpfeng, 43, Centro Cívico, com CNPJ nº 02.345.707/0001-65, neste ato representado por seu(sua) Diretor(a) Superintendente e por seu(sua) Diretor(a) Administrativo(a) e Financeiro(a), resolvem apostilar o Contrato nº ${c.numero_ano || '[CONTRATO]'}, mediante as seguintes Cláusulas.\n\n` +
    `CLÁUSULA PRIMEIRA\n` +
    `Em conformidade com as regras contratuais, reajustam-se os valores unitários dos itens contratados no percentual de ${percentual}%, decorrente da variação do ${m.serie}, apurado no acumulado de ${periodoIni} a ${periodoFim}.\n\n` +
    `CLÁUSULA SEGUNDA\n` +
    `Com o reajuste, os valores passam a vigorar conforme detalhamento a seguir:\n${tabela}\n\n` +
    `CLÁUSULA TERCEIRA\n` +
    `Ficam mantidas as demais Cláusulas e condições constantes do Contrato original, não expressamente alteradas por este Termo.\n\n` +
    `Foz do Iguaçu, ${hoje.toLocaleDateString('pt-BR')} (data de assinatura no sistema).`;
}

// Registro: chave_modelo (vindo de checklist_modelo) → gerador de texto.
const GERADORES_TEXTO = {
  memorando_abertura: (c, tipo, rotulo) => _textoMemorandoAbertura(c, tipo, rotulo),
  autorizacao: (c, tipo) => _textoAutorizacao(c, tipo),
  despacho_daf: (c, tipo, rotulo) => _textoDespachoDAF(c, tipo, rotulo),
  solicitacao_contabilidade: (c, tipo) => _textoSolicitacaoContabilidade(c, tipo),
  termo_apostilamento: (c, tipo) => _textoTermoApostilamento(c, tipo),
};

function gerarTextoEtapa(chaveModelo) {
  const c = eventoAtual.contratos || {};
  const tipo = eventoAtual.tipos_evento?.tipo;
  const rotulo = eventoAtual.tipos_evento?.rotulo;
  const gerador = GERADORES_TEXTO[chaveModelo];
  if (!gerador) return;
  document.getElementById('textoAutorizacao').value = gerador(c, tipo, rotulo);
  document.getElementById('textoAutorizacao').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function gerarTextoAutorizacao() {
  const c = eventoAtual.contratos || {};
  const tipo = eventoAtual.tipos_evento?.tipo;
  const rotulo = eventoAtual.tipos_evento?.rotulo;
  const tipoDoc = document.getElementById('tipoDocumentoTexto').value;
  const chave = tipoDoc === 'autorizacao' ? 'autorizacao' : 'memorando_abertura';
  document.getElementById('textoAutorizacao').value = GERADORES_TEXTO[chave](c, tipo, rotulo);
}

function copiarTextoAutorizacao() {
  const el = document.getElementById('textoAutorizacao');
  el.select();
  navigator.clipboard?.writeText(el.value).catch(() => {});
}

// -------------------------------------------------------------- reajuste
let memoriaReajusteAtual = null;

async function calcularReajuste() {
  const dataBase = document.getElementById('reajusteDataBase').value;
  const dataRef = document.getElementById('reajusteDataRef').value;
  const serie = document.getElementById('reajusteIndice').value;
  const out = document.getElementById('reajusteResultado');
  if (!dataBase || !dataRef) {
    out.innerHTML = '<div class="alert alert-warning py-2 small mb-0">Preencha data-base e data de referência.</div>';
    return;
  }
  if (dataBase >= dataRef) {
    out.innerHTML = '<div class="alert alert-warning py-2 small mb-0">Data-base precisa ser anterior à data de referência.</div>';
    return;
  }

  const { data, error } = await supabase.rpc('calcular_memoria_reajuste', {
    p_serie: serie, p_data_base: dataBase, p_data_referencia: dataRef
  });
  if (error) { out.innerHTML = `<div class="alert alert-danger py-2 small mb-0">Erro: ${esc(error.message)}</div>`; return; }
  if (!data || !data.length) {
    out.innerHTML = '<div class="alert alert-warning py-2 small mb-0">Nenhum índice carregado nesse período. Rode a atualização de índices (Apps Script) e tente de novo.</div>';
    memoriaReajusteAtual = null;
    return;
  }

  const fatorFinal = Number(data[data.length - 1].fator_acumulado);
  const tabelaIndices = `
    <div class="table-responsive mb-2">
      <table class="table table-sm table-bordered mb-0">
        <thead class="table-light"><tr><th>Competência</th><th>${esc(serie)} (%)</th><th>Fator acumulado</th></tr></thead>
        <tbody>
          ${data.map(m => `<tr><td>${m.competencia.slice(0, 7)}</td><td>${Number(m.indice_mensal).toFixed(2)}</td><td>${Number(m.fator_acumulado).toFixed(6)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  // Se o contrato tem itens cadastrados (itens_contrato_saldo), reajuste é
  // calculado item a item e o valor global é a soma — é assim que o OXY e a
  // prática real tratam reajuste, não um percentual único sobre o total.
  const { data: itensRaw, error: eItens } = await supabase
    .from('itens_contrato_saldo')
    .select('*')
    .eq('contrato_id', eventoAtual.contrato_id)
    .order('data_referencia', { ascending: false });
  if (eItens) { out.innerHTML = `<div class="alert alert-danger py-2 small mb-0">Erro ao buscar itens: ${esc(eItens.message)}</div>`; return; }

  const itens = (itensRaw && itensRaw.length)
    ? itensRaw.filter(i => i.data_referencia === itensRaw[0].data_referencia)
    : [];

  if (itens.length) {
    const linhas = itens.map(it => {
      const valorUnitarioNovo = it.valor_unitario != null ? Number(it.valor_unitario) * fatorFinal : null;
      // Item tipo "VALOR" (ex.: serviço continuado mensal) não tem
      // quantidade própria — o fator aplica direto sobre o valor contratado,
      // não sobre quantidade × valor unitário.
      const valorTotalNovo = it.tipo_controle === 'VALOR'
        ? Number(it.valor_contratado) * fatorFinal
        : valorUnitarioNovo * Number(it.quantidade_contratada);
      return { ...it, valorUnitarioNovo, valorTotalNovo };
    });
    const valorGlobalAtual = linhas.reduce((s, l) => s + Number(l.valor_contratado), 0);
    const valorGlobalNovo = linhas.reduce((s, l) => s + l.valorTotalNovo, 0);
    memoriaReajusteAtual = { modo: 'itens', serie, dataBase, dataRef, fatorFinal, itens: linhas, valorGlobalAtual, valorGlobalNovo };

    out.innerHTML = tabelaIndices + `
      <div class="small mb-1">Fator acumulado final: <b>${fatorFinal.toFixed(6)}</b> (${((fatorFinal - 1) * 100).toFixed(2)}%) — calculado por item (${linhas.length} itens, data-ref. ${itens[0].data_referencia}):</div>
      <div class="table-responsive mb-2">
        <table class="table table-sm table-bordered mb-0">
          <thead class="table-light"><tr><th>Item</th><th>Descrição</th><th>Qtd</th><th>Valor unit. atual</th><th>Valor unit. novo</th><th>Total novo</th></tr></thead>
          <tbody>
            ${linhas.map(l => `<tr><td>${esc(l.item)}</td><td class="small">${esc(l.item_descricao)}</td><td>${l.quantidade_contratada != null ? Number(l.quantidade_contratada) : '—'}</td><td>${formatarMoeda(l.valor_unitario)}</td><td>${l.valorUnitarioNovo != null ? formatarMoeda(l.valorUnitarioNovo) : '—'}</td><td>${formatarMoeda(l.valorTotalNovo)}</td></tr>`).join('')}
          </tbody>
          <tfoot><tr class="table-light fw-bold"><td colspan="5" class="text-end">Total</td><td>${formatarMoeda(valorGlobalNovo)}</td></tr></tfoot>
        </table>
      </div>
      <div class="small mb-2">Valor global atual: ${formatarMoeda(valorGlobalAtual)} → Valor global com reajuste: <b>${formatarMoeda(valorGlobalNovo)}</b></div>
      <div class="alert alert-info py-2 small mb-2">Memória de cálculo apenas calculada — nada foi gravado ainda. Confira os números antes de aplicar.</div>
      <button class="btn btn-sm btn-success" onclick="window.aplicarReajuste()">✔ Aplicar no evento</button>
    `;
    return;
  }

  // Sem itens cadastrados ainda para este contrato: aplica sobre o valor
  // global/mensal, como antes.
  const c = eventoAtual.contratos || {};
  const base = Number(c.valor_mensal ?? c.valor_global ?? 0);
  const valorNovo = base * fatorFinal;
  memoriaReajusteAtual = { modo: 'global', serie, dataBase, dataRef, fatorFinal, base, valorNovo };

  out.innerHTML = tabelaIndices + `
    <div class="small mb-2">
      Fator acumulado final: <b>${fatorFinal.toFixed(6)}</b>
      (${((fatorFinal - 1) * 100).toFixed(2)}%)<br>
      Valor atual: ${formatarMoeda(base)} → Valor com reajuste: <b>${formatarMoeda(valorNovo)}</b>
      <div class="text-muted" style="font-size:11px">Este contrato ainda não tem itens cadastrados (itens_contrato_saldo) — calculado sobre o valor global/mensal. Cadastrando os itens, o cálculo passa a ser item a item automaticamente.</div>
    </div>
    <div class="alert alert-info py-2 small mb-2">Memória de cálculo apenas calculada — nada foi gravado ainda. Confira os números antes de aplicar.</div>
    <button class="btn btn-sm btn-success" onclick="window.aplicarReajuste()">✔ Aplicar no evento</button>
  `;
}

async function aplicarReajuste() {
  if (!memoriaReajusteAtual || !eventoAtual) return;
  const m = memoriaReajusteAtual;

  if (m.modo === 'itens') {
    const hoje = new Date().toISOString().slice(0, 10);
    const novasLinhas = m.itens.map(it => ({
      contrato_id: eventoAtual.contrato_id,
      item: it.item,
      item_descricao: it.item_descricao,
      unidade: it.unidade,
      tipo_controle: it.tipo_controle,
      lote_contrato_ordem: it.lote_contrato_ordem,
      item_contrato_ordem: it.item_contrato_ordem,
      quantidade_contratada: it.quantidade_contratada,
      valor_unitario: it.valorUnitarioNovo,
      valor_contratado: it.valorTotalNovo,
      quantidade_suprimido: it.quantidade_suprimido,
      valor_suprimido: it.valor_suprimido,
      quantidade_solicitado: it.quantidade_solicitado,
      valor_solicitado: it.valor_solicitado,
      saldo_contrato: it.saldo_contrato,
      valor_saldo_contrato: it.valor_saldo_contrato,
      data_referencia: hoje,
      origem: 'reajuste_aplicado'
    }));
    const { error: eItens } = await supabase
      .from('itens_contrato_saldo')
      .upsert(novasLinhas, { onConflict: 'contrato_id,item,data_referencia' });
    if (eItens) { alert('Erro ao gravar novos valores de item: ' + eItens.message); return; }

    const { error } = await supabase
      .from('eventos')
      .update({ valor_anterior: m.valorGlobalAtual, valor_novo: m.valorGlobalNovo, indice_periodo: `${m.serie} até ${m.dataRef}` })
      .eq('id', eventoAtual.id);
    if (error) { alert('Erro ao aplicar reajuste no evento: ' + error.message); return; }
  } else {
    const { error } = await supabase
      .from('eventos')
      .update({ valor_anterior: m.base, valor_novo: m.valorNovo, indice_periodo: `${m.serie} até ${m.dataRef}` })
      .eq('id', eventoAtual.id);
    if (error) { alert('Erro ao aplicar reajuste no evento: ' + error.message); return; }
  }

  alert('Reajuste aplicado ao evento (valor_anterior/valor_novo/indice_periodo' + (m.modo === 'itens' ? ' + novo snapshot de itens' : '') + '). Lembre de seguir o checklist para formalizar o ato.');
  await carregarEventos();
  await selecionarEvento(eventoAtual.id);
}

async function atualizarCampoExec(id, campo, valor) {
  const { error } = await supabase.from('checklist_exec').update({ [campo]: valor }).eq('id', id);
  if (error) { alert('Erro ao salvar: ' + error.message); return; }
  const item = checklistExecAtual.find(c => c.id === id);
  if (item) item[campo] = valor;
  if (campo === 'status') renderChecklistExec();
}

// -------------------------------------------------------------- anexos
async function enviarAnexos(checklistExecId, fileList) {
  for (const file of Array.from(fileList)) {
    const caminho = `${checklistExecId}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from(BUCKET_ANEXOS).upload(caminho, file);
    if (upErr) { alert('Erro ao enviar ' + file.name + ': ' + upErr.message); continue; }
    const hash = await sha256(file);
    const { error: insErr } = await supabase.from('anexos').insert({
      checklist_exec_id: checklistExecId,
      ordem: (anexosPorItem[checklistExecId]?.length || 0) + 1,
      nome_arquivo: file.name,
      caminho_storage: caminho,
      tamanho_bytes: file.size,
      hash_arquivo: hash
    });
    if (insErr) alert('Enviado, mas erro ao registrar metadado de ' + file.name + ': ' + insErr.message);
  }
  await selecionarEvento(eventoAtual.id);
}

async function sha256(file) {
  const buf = await file.arrayBuffer();
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function baixarAnexo(anexoId) {
  const a = Object.values(anexosPorItem).flat().find(x => x.id === anexoId);
  if (!a || !a.caminho_storage) { alert('Anexo sem arquivo (já arquivado?).'); return; }
  const { data, error } = await supabase.storage.from(BUCKET_ANEXOS).download(a.caminho_storage);
  if (error) { alert('Erro ao baixar: ' + error.message); return; }
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url; link.download = a.nome_arquivo;
  link.click();
  URL.revokeObjectURL(url);
}

async function excluirAnexo(anexoId, checklistExecId) {
  if (!confirm('Excluir este anexo?')) return;
  const a = (anexosPorItem[checklistExecId] || []).find(x => x.id === anexoId);
  if (a?.caminho_storage) await supabase.storage.from(BUCKET_ANEXOS).remove([a.caminho_storage]);
  const { error } = await supabase.from('anexos').delete().eq('id', anexoId);
  if (error) { alert('Erro ao excluir: ' + error.message); return; }
  await selecionarEvento(eventoAtual.id);
}

// -------------------------------------------------------- dossiê em PDF
async function gerarDossie(comAnexos) {
  const aviso = document.getElementById('dossieAviso');
  aviso.style.display = 'none';

  // Validação: item obrigatório (não "não se aplica") precisa de justificativa,
  // e se exige_anexo, precisa de ao menos 1 anexo.
  const bloqueios = [];
  for (const c of checklistExecAtual) {
    if (c.status === 'nao_se_aplica') continue;
    if (!c.texto_justificativa || !c.texto_justificativa.trim()) {
      bloqueios.push(`"${c.etapa}" está sem texto de justificativa/manifestação.`);
    }
    if (comAnexos && c.exige_anexo && !(anexosPorItem[c.id] || []).length) {
      bloqueios.push(`"${c.etapa}" exige anexo e não tem nenhum.`);
    }
  }
  if (bloqueios.length) {
    aviso.innerHTML = '⚠️ Não é possível gerar agora:<br>' + bloqueios.map(b => '• ' + esc(b)).join('<br>');
    aviso.style.display = 'block';
    return;
  }

  const conteudo = await PDFDocument.create();
  const fonteNormal = await conteudo.embedFont(StandardFonts.Helvetica);
  const fonteNegrito = await conteudo.embedFont(StandardFonts.HelveticaBold);
  const margem = 50, larguraPg = 595.28, alturaPg = 841.89; // A4

  const itemPaginaInicio = {}; // ordem -> índice de página (0-based) dentro de `conteudo`
  const naoMergeados = [];

  for (const c of checklistExecAtual) {
    itemPaginaInicio[c.ordem] = conteudo.getPageCount();
    let pagina = conteudo.addPage([larguraPg, alturaPg]);
    let y = alturaPg - margem;
    pagina.drawText(`${c.ordem}. ${c.etapa}`, { x: margem, y, size: 12, font: fonteNegrito });
    y -= 20;
    const texto = c.status === 'nao_se_aplica' ? '[Não se aplica a este evento.]' : (c.texto_justificativa || '');
    const linhas = quebrarLinhas(texto, fonteNormal, 10, larguraPg - margem * 2);
    for (const linha of linhas) {
      if (y < margem + 20) { pagina = conteudo.addPage([larguraPg, alturaPg]); y = alturaPg - margem; }
      pagina.drawText(linha, { x: margem, y, size: 10, font: fonteNormal });
      y -= 14;
    }

    const anexosItem = comAnexos ? (anexosPorItem[c.id] || []) : [];
    for (let i = 0; i < anexosItem.length; i++) {
      const a = anexosItem[i];
      if (y < margem + 20) { pagina = conteudo.addPage([larguraPg, alturaPg]); y = alturaPg - margem; }
      pagina.drawText(`Anexo ${i + 1} — ${a.nome_arquivo}`, { x: margem, y, size: 10, font: fonteNormal, color: rgb(.2,.2,.5) });
      y -= 14;

      if (!a.caminho_storage) { naoMergeados.push(`${a.nome_arquivo} (sem arquivo — já arquivado no Drive)`); continue; }
      if (!/\.pdf$/i.test(a.nome_arquivo)) { naoMergeados.push(`${a.nome_arquivo} (formato não é PDF — não mesclado, baixe separadamente)`); continue; }
      const { data: blob, error } = await supabase.storage.from(BUCKET_ANEXOS).download(a.caminho_storage);
      if (error) { naoMergeados.push(`${a.nome_arquivo} (erro ao baixar: ${error.message})`); continue; }
      try {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const origem = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const paginasCopiadas = await conteudo.copyPages(origem, origem.getPageIndices());
        paginasCopiadas.forEach(p => conteudo.addPage(p));
      } catch (e) {
        naoMergeados.push(`${a.nome_arquivo} (PDF protegido/corrompido: ${e.message})`);
      }
      pagina = conteudo.getPage(conteudo.getPageCount() - 1);
    }
  }

  // Índice (assume 1 página — suficiente para os checklists atuais, até ~35 itens)
  const indice = await PDFDocument.create();
  const fonteIndice = await indice.embedFont(StandardFonts.Helvetica);
  const fonteIndiceNegrito = await indice.embedFont(StandardFonts.HelveticaBold);
  const paginaIndice = indice.addPage([larguraPg, alturaPg]);
  let yIndice = alturaPg - margem;
  paginaIndice.drawText('Índice', { x: margem, y: yIndice, size: 14, font: fonteIndiceNegrito });
  yIndice -= 24;
  const qtdPaginasCapa = 1, qtdPaginasIndice = 1;
  for (const c of checklistExecAtual) {
    const paginaFinal = qtdPaginasCapa + qtdPaginasIndice + itemPaginaInicio[c.ordem] + 1;
    paginaIndice.drawText(`${c.ordem}. ${truncar(c.etapa, 70)}`, { x: margem, y: yIndice, size: 10, font: fonteIndice });
    paginaIndice.drawText(`pág. ${paginaFinal}`, { x: larguraPg - margem - 60, y: yIndice, size: 10, font: fonteIndice });
    yIndice -= 16;
    if (yIndice < margem) break; // checklists muito longos: índice fica incompleto, aviso abaixo
  }

  // Capa
  const capaDoc = await PDFDocument.create();
  const fonteCapa = await capaDoc.embedFont(StandardFonts.Helvetica);
  const fonteCapaNegrito = await capaDoc.embedFont(StandardFonts.HelveticaBold);
  const paginaCapa = capaDoc.addPage([larguraPg, alturaPg]);
  let yCapa = alturaPg - 150;
  const linhasCapa = [
    ['MINUTA — SUJEITA À REVISÃO', fonteCapaNegrito, 10, rgb(.7,0,0)],
    ['', fonteCapa, 10, rgb(0,0,0)],
    [`Contrato: ${eventoAtual.contratos?.numero_ano || '—'}`, fonteCapaNegrito, 14, rgb(0,0,0)],
    [`Contratada: ${eventoAtual.contratos?.contratada || '—'}`, fonteCapa, 11, rgb(0,0,0)],
    [`Objeto: ${eventoAtual.contratos?.objeto || '—'}`, fonteCapa, 11, rgb(0,0,0)],
    [`Tipo de evento: ${eventoAtual.tipos_evento?.rotulo || '—'}`, fonteCapaNegrito, 11, rgb(0,0,0)],
    [`Data de abertura: ${eventoAtual.data_abertura || '—'}`, fonteCapa, 11, rgb(0,0,0)],
    ['', fonteCapa, 10, rgb(0,0,0)],
    [`Gerado em: ${new Date().toLocaleString('pt-BR')}`, fonteCapa, 9, rgb(.4,.4,.4)],
  ];
  for (const [texto, fonte, tamanho, cor] of linhasCapa) {
    if (texto) paginaCapa.drawText(texto, { x: margem, y: yCapa, size: tamanho, font: fonte, color: cor });
    yCapa -= tamanho + 10;
  }

  // Monta documento final: capa + índice + conteúdo
  const final = await PDFDocument.create();
  for (const p of await final.copyPages(capaDoc, capaDoc.getPageIndices())) final.addPage(p);
  for (const p of await final.copyPages(indice, indice.getPageIndices())) final.addPage(p);
  for (const p of await final.copyPages(conteudo, conteudo.getPageIndices())) final.addPage(p);

  // Numeração de página no rodapé, em todo o documento
  const fonteRodape = await final.embedFont(StandardFonts.Helvetica);
  const paginas = final.getPages();
  paginas.forEach((p, i) => {
    p.drawText(`${i + 1} / ${paginas.length}`, { x: larguraPg - margem - 40, y: 20, size: 9, font: fonteRodape, color: rgb(.4,.4,.4) });
  });

  const bytesFinal = await final.save();
  const blobFinal = new Blob([bytesFinal], { type: 'application/pdf' });
  const url = URL.createObjectURL(blobFinal);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MINUTA_dossie_${eventoAtual.contratos?.numero_ano?.replace(/\W+/g,'_') || 'evento'}_${comAnexos ? 'completo' : 'relatorio'}.pdf`;
  a.click();
  URL.revokeObjectURL(url);

  if (naoMergeados.length) {
    aviso.innerHTML = '✅ Dossiê gerado. Atenção — não foi possível mesclar:<br>' + naoMergeados.map(m => '• ' + esc(m)).join('<br>');
    aviso.className = 'alert alert-warning py-2 small';
    aviso.style.display = 'block';
  }
}

function quebrarLinhas(texto, fonte, tamanho, larguraMax) {
  const palavras = String(texto || '').split(/\s+/);
  const linhas = [];
  let linhaAtual = '';
  for (const palavra of palavras) {
    const teste = linhaAtual ? linhaAtual + ' ' + palavra : palavra;
    if (fonte.widthOfTextAtSize(teste, tamanho) > larguraMax) {
      if (linhaAtual) linhas.push(linhaAtual);
      linhaAtual = palavra;
    } else {
      linhaAtual = teste;
    }
  }
  if (linhaAtual) linhas.push(linhaAtual);
  return linhas;
}

function truncar(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ---------------------------------------------------------------- expõe
window.entrar = entrar;
window.criarConta = criarConta;
window.entrarComGoogle = entrarComGoogle;
window.sair = sair;
window.irPara = irPara;
window.selecionarTipo = selecionarTipo;
window.moverEtapa = moverEtapa;
window.abrirModalEtapa = abrirModalEtapa;
window.editarEtapa = editarEtapa;
window.fecharModalEtapa = fecharModalEtapa;
window.salvarEtapa = salvarEtapa;
window.excluirEtapa = excluirEtapa;
window.carregarEventos = carregarEventos;
window.selecionarEvento = selecionarEvento;
window.gerarTextoAutorizacao = gerarTextoAutorizacao;
window.gerarTextoEtapa = gerarTextoEtapa;
window.copiarTextoAutorizacao = copiarTextoAutorizacao;
window.calcularReajuste = calcularReajuste;
window.aplicarReajuste = aplicarReajuste;
window.atualizarCampoExec = atualizarCampoExec;
window.enviarAnexos = enviarAnexos;
window.baixarAnexo = baixarAnexo;
window.excluirAnexo = excluirAnexo;
window.gerarDossie = gerarDossie;
window.carregarContratos = carregarContratos;
window.renderContratos = renderContratos;
window.selecionarContrato = selecionarContrato;
window.salvarCertidao = salvarCertidao;
window.enviarCertidaoArquivo = enviarCertidaoArquivo;
window.baixarCertidao = baixarCertidao;
window.excluirArquivoCertidao = excluirArquivoCertidao;
window.atualizarCamposTRD = atualizarCamposTRD;
window.carregarItensTRD = carregarItensTRD;
window.atualizarValorItemTRD = atualizarValorItemTRD;
window.atualizarGlosaItemTRD = atualizarGlosaItemTRD;
window.gerarTRPouTRD = gerarTRPouTRD;
window.atualizarRespostaMaoObra = atualizarRespostaMaoObra;
window.abrirEventoNoContrato = abrirEventoNoContrato;
window.irParaEvento = irParaEvento;
window.filtrarPainel = filtrarPainel;

// -------------------------------------------------------------- bootstrap
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) aoLogar();
});
