import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let tiposEvento = [];
let tipoSelecionadoId = null;
let checklistAtual = [];

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
  await carregarTiposEvento();
  irPara('checklists');
}

// ------------------------------------------------------------ navegação
function irPara(tela) {
  document.getElementById('tela-tipos').style.display = tela === 'tipos' ? 'block' : 'none';
  document.getElementById('tela-checklists').style.display = tela === 'checklists' ? 'block' : 'none';
  document.querySelectorAll('#sidebar a').forEach(a => a.classList.toggle('active', a.dataset.tela === tela));
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

// -------------------------------------------------------------- bootstrap
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) aoLogar();
});
