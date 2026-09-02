import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ====== CONFIGURAÇÃO — troque pelos dados do seu projeto Supabase ======
const SUPABASE_URL = 'https://mnxuqigegourljwaylzw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nXMtbLXgW3p2qGuyB1dexg_mj0dAnjl';
// =========================================================================

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MESES_PT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

// ---------- estado em memória ----------
let membros = [];       // todos os membros (ativos e inativos)
let feriadosSet = new Set(); // datas 'YYYY-MM-DD' sem culto
let presencaSelecionada = new Set(); // membro_ids marcados na view atual de presença

// ---------- utilidades de data ----------
function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function isoParaData(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function diaDaSemana(iso) {
  return isoParaData(iso).getDay(); // 0=domingo ... 6=sábado
}

function diasUteisDoMes(anoMes) {
  // anoMes: 'YYYY-MM' -> lista de datas úteis (seg-sex) que não estão em feriadosSet
  const [ano, mes] = anoMes.split('-').map(Number);
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dias = [];
  for (let d = 1; d <= ultimoDia; d++) {
    const iso = `${ano}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow = new Date(ano, mes - 1, d).getDay();
    if (dow >= 1 && dow <= 5 && !feriadosSet.has(iso)) dias.push(iso);
  }
  return dias;
}

function fimDoMes(anoMes) {
  const [ano, mes] = anoMes.split('-').map(Number);
  const ultimoDia = new Date(ano, mes, 0).getDate();
  return `${anoMes}-${String(ultimoDia).padStart(2,'0')}`;
}

function mesAnterior(anoMes, n = 1) {
  const [ano, mes] = anoMes.split('-').map(Number);
  const d = new Date(ano, mes - 1 - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function rotuloMes(anoMes) {
  const [ano, mes] = anoMes.split('-').map(Number);
  return `${MESES_PT[mes-1]} ${ano}`;
}

// ---------- autenticação ----------
const telaLogin = document.getElementById('tela-login');
const appEl = document.getElementById('app');

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  const erroEl = document.getElementById('login-erro');
  erroEl.textContent = '';
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    erroEl.textContent = 'E-mail ou senha inválidos.';
    return;
  }
  await iniciarApp();
});

document.getElementById('btn-sair').addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.reload();
});

async function checarSessao() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await iniciarApp();
  } else {
    telaLogin.classList.remove('oculto');
    appEl.classList.add('oculto');
  }
}

async function iniciarApp() {
  telaLogin.classList.add('oculto');
  appEl.classList.remove('oculto');
  await carregarMembros();
  await carregarFeriados();
  configurarAbas();
  configurarViewPresenca();
  configurarViewMembros();
  configurarViewFeriados();
  configurarViewRelatorios();
}

// ---------- navegação por abas ----------
function configurarAbas() {
  document.querySelectorAll('.aba').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.aba').forEach(b => b.classList.remove('ativa'));
      document.querySelectorAll('.view').forEach(v => v.classList.add('oculto'));
      btn.classList.add('ativa');
      document.getElementById(`view-${btn.dataset.view}`).classList.remove('oculto');
    });
  });

  document.querySelectorAll('.sub-aba').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sub-aba').forEach(b => b.classList.remove('ativa'));
      document.querySelectorAll('.sub-view').forEach(v => v.classList.add('oculto'));
      btn.classList.add('ativa');
      document.getElementById(`sub-${btn.dataset.subview}`).classList.remove('oculto');
    });
  });
}

// ---------- dados: membros ----------
async function carregarMembros() {
  const { data, error } = await supabase.from('membros').select('*').order('nome');
  if (!error) membros = data || [];
}

async function carregarFeriados() {
  const { data, error } = await supabase.from('dias_sem_culto').select('*').order('data');
  feriadosSet = new Set((data || []).map(f => f.data));
  return data || [];
}

// ---------- VIEW: Presença ----------
function configurarViewPresenca() {
  const inputData = document.getElementById('data-culto');
  inputData.value = hojeISO();
  inputData.addEventListener('change', renderizarPresenca);
  document.getElementById('btn-salvar-presenca').addEventListener('click', salvarPresenca);
  renderizarPresenca();
}

async function renderizarPresenca() {
  const iso = document.getElementById('data-culto').value;
  const aviso = document.getElementById('aviso-sem-culto');
  const lista = document.getElementById('lista-presenca');
  const rodape = document.querySelector('#view-presenca .rodape-view');
  const dow = diaDaSemana(iso);

  if (dow === 0 || dow === 6) {
    aviso.textContent = 'Fim de semana — sem culto do escritório neste dia.';
    aviso.classList.remove('oculto');
    lista.innerHTML = '';
    rodape.classList.add('oculto');
    return;
  }
  if (feriadosSet.has(iso)) {
    aviso.textContent = 'Este dia está marcado como sem culto (feriado/exceção).';
    aviso.classList.remove('oculto');
    lista.innerHTML = '';
    rodape.classList.add('oculto');
    return;
  }
  aviso.classList.add('oculto');
  rodape.classList.remove('oculto');

  const { data: existentes } = await supabase.from('presencas').select('membro_id').eq('data', iso);
  presencaSelecionada = new Set((existentes || []).map(p => p.membro_id));

  const ativos = membros.filter(m => m.ativo);
  lista.innerHTML = '';
  ativos.forEach(m => {
    const li = document.createElement('li');
    li.className = 'item-presenca' + (presencaSelecionada.has(m.id) ? ' marcado' : '');
    li.dataset.id = m.id;
    li.innerHTML = `<span class="nome">${escapeHtml(m.nome)}</span><span class="marca"></span>`;
    li.addEventListener('click', () => {
      if (presencaSelecionada.has(m.id)) {
        presencaSelecionada.delete(m.id);
        li.classList.remove('marcado');
      } else {
        presencaSelecionada.add(m.id);
        li.classList.add('marcado');
      }
      atualizarContador();
    });
    lista.appendChild(li);
  });
  atualizarContador();
}

function atualizarContador() {
  const ativos = membros.filter(m => m.ativo).length;
  document.getElementById('contador-presenca').textContent =
    `${presencaSelecionada.size} de ${ativos} presentes`;
}

async function salvarPresenca() {
  const iso = document.getElementById('data-culto').value;
  const btn = document.getElementById('btn-salvar-presenca');
  btn.disabled = true;
  btn.textContent = 'Salvando…';

  await supabase.from('presencas').delete().eq('data', iso);
  const linhas = [...presencaSelecionada].map(membro_id => ({ data: iso, membro_id, presente: true }));
  if (linhas.length > 0) {
    await supabase.from('presencas').insert(linhas);
  }

  btn.disabled = false;
  btn.textContent = 'Salvar registro';
}

// ---------- VIEW: Membros ----------
function configurarViewMembros() {
  document.getElementById('form-membro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('novo-membro-nome');
    const nome = input.value.trim();
    if (!nome) return;
    await supabase.from('membros').insert({ nome, ativo: true });
    input.value = '';
    await carregarMembros();
    renderizarMembros();
  });
  renderizarMembros();
}

function renderizarMembros() {
  const lista = document.getElementById('lista-membros');
  lista.innerHTML = '';
  membros.forEach(m => {
    const li = document.createElement('li');
    li.className = m.ativo ? '' : 'inativo';
    li.innerHTML = `
      <span class="nome">${escapeHtml(m.nome)}</span>
      <span class="acoes">
        <button data-acao="toggle">${m.ativo ? 'Desativar' : 'Ativar'}</button>
      </span>`;
    li.querySelector('[data-acao="toggle"]').addEventListener('click', async () => {
      await supabase.from('membros').update({ ativo: !m.ativo }).eq('id', m.id);
      await carregarMembros();
      renderizarMembros();
    });
    lista.appendChild(li);
  });
}

// ---------- VIEW: Feriados ----------
function configurarViewFeriados() {
  document.getElementById('form-feriado').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dataInput = document.getElementById('novo-feriado-data');
    const motivoInput = document.getElementById('novo-feriado-motivo');
    if (!dataInput.value) return;
    await supabase.from('dias_sem_culto').insert({ data: dataInput.value, motivo: motivoInput.value.trim() || null });
    dataInput.value = '';
    motivoInput.value = '';
    await carregarFeriados();
    renderizarFeriados();
  });
  renderizarFeriados();
}

async function renderizarFeriados() {
  const feriados = await carregarFeriados();
  const lista = document.getElementById('lista-feriados');
  lista.innerHTML = '';
  feriados.sort((a,b) => b.data.localeCompare(a.data)).forEach(f => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>
        <span class="nome">${f.data.split('-').reverse().join('/')}</span>
        ${f.motivo ? `<span class="meta"> — ${escapeHtml(f.motivo)}</span>` : ''}
      </span>
      <span class="acoes"><button data-acao="remover" class="destaque">Remover</button></span>`;
    li.querySelector('[data-acao="remover"]').addEventListener('click', async () => {
      await supabase.from('dias_sem_culto').delete().eq('id', f.id);
      await carregarFeriados();
      renderizarFeriados();
    });
    lista.appendChild(li);
  });
}

// ---------- VIEW: Relatórios ----------
function configurarViewRelatorios() {
  const inputMes = document.getElementById('mes-relatorio');
  const agora = new Date();
  inputMes.value = `${agora.getFullYear()}-${String(agora.getMonth()+1).padStart(2,'0')}`;
  inputMes.addEventListener('change', renderizarRelatorioMensal);
  document.getElementById('qtd-meses').addEventListener('change', renderizarComparativo);

  renderizarRelatorioMensal();
  renderizarComparativo();
}

async function renderizarRelatorioMensal() {
  const anoMes = document.getElementById('mes-relatorio').value;
  if (!anoMes) return;
  const dias = diasUteisDoMes(anoMes);
  const inicio = `${anoMes}-01`;
  const fim = fimDoMes(anoMes);

  const { data: presencas } = await supabase
    .from('presencas')
    .select('membro_id')
    .gte('data', inicio)
    .lte('data', fim);

  const contagem = {};
  (presencas || []).forEach(p => { contagem[p.membro_id] = (contagem[p.membro_id] || 0) + 1; });

  const totalPresencas = (presencas || []).length;
  const mediaDiaria = dias.length > 0 ? (totalPresencas / dias.length) : 0;

  document.getElementById('resumo-mensal').innerHTML = `
    <div class="resumo-item"><span class="num">${dias.length}</span><span class="rotulo">dias de culto</span></div>
    <div class="resumo-item"><span class="num">${mediaDiaria.toFixed(1)}</span><span class="rotulo">presença média/dia</span></div>
    <div class="resumo-item"><span class="num">${membros.filter(m=>m.ativo).length}</span><span class="rotulo">membros ativos</span></div>
  `;

  const membrosRelevantes = membros.filter(m => m.ativo || contagem[m.id]);
  const linhas = membrosRelevantes.map(m => {
    const qtd = contagem[m.id] || 0;
    const pct = dias.length > 0 ? (qtd / dias.length * 100) : 0;
    return { nome: m.nome, qtd, pct };
  }).sort((a,b) => b.pct - a.pct || a.nome.localeCompare(b.nome));

  const tbody = document.querySelector('#tabela-mensal tbody');
  tbody.innerHTML = linhas.map(l => `
    <tr><td>${escapeHtml(l.nome)}</td><td>${l.qtd}</td><td>${l.pct.toFixed(0)}%</td></tr>
  `).join('') || '<tr><td colspan="3">Sem registros neste mês.</td></tr>';
}

async function renderizarComparativo() {
  const n = Number(document.getElementById('qtd-meses').value);
  const agora = new Date();
  const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth()+1).padStart(2,'0')}`;
  const listaMeses = [];
  for (let i = n - 1; i >= 0; i--) listaMeses.push(mesAnterior(mesAtual, i));

  // dados por mês
  const porMes = [];
  for (const am of listaMeses) {
    const dias = diasUteisDoMes(am);
    const inicio = `${am}-01`;
    const fim = fimDoMes(am);
    const { data: presencas } = await supabase
      .from('presencas')
      .select('membro_id')
      .gte('data', inicio)
      .lte('data', fim);
    const contagem = {};
    (presencas || []).forEach(p => { contagem[p.membro_id] = (contagem[p.membro_id] || 0) + 1; });
    porMes.push({ mes: am, dias: dias.length, contagem, media: dias.length ? (presencas||[]).length / dias.length : 0 });
  }

  // gráfico: média diária por mês
  const maxMedia = Math.max(0.1, ...porMes.map(m => m.media));
  const grafico = document.getElementById('grafico-comparativo');
  grafico.innerHTML = porMes.map((m, i) => {
    const largura = Math.round((m.media / maxMedia) * 100);
    let tendencia = '';
    if (i > 0) {
      const diff = m.media - porMes[i-1].media;
      if (diff > 0.05) tendencia = ' <span class="tendencia-alta">▲</span>';
      else if (diff < -0.05) tendencia = ' <span class="tendencia-baixa">▼</span>';
    }
    return `
      <div class="barra-linha">
        <span class="rotulo-mes">${rotuloMes(m.mes).split(' ')[0].slice(0,3)}/${m.mes.slice(2,4)}</span>
        <span class="trilha"><span class="preenchimento" style="width:${largura}%"></span></span>
        <span class="valor">${m.media.toFixed(1)}${tendencia}</span>
      </div>`;
  }).join('');

  // tabela: % de presença por membro em cada mês
  const membrosRelevantes = membros.filter(m => m.ativo || porMes.some(pm => pm.contagem[m.id]));
  const cabecalho = `<thead><tr><th>Membro</th>${porMes.map(m => `<th>${rotuloMes(m.mes).split(' ')[0].slice(0,3)}/${m.mes.slice(2,4)}</th>`).join('')}</tr></thead>`;
  const linhas = membrosRelevantes.map(m => {
    const celulas = porMes.map(pm => {
      const pct = pm.dias > 0 ? ((pm.contagem[m.id] || 0) / pm.dias * 100) : 0;
      return `<td>${pct.toFixed(0)}%</td>`;
    }).join('');
    return `<tr><td>${escapeHtml(m.nome)}</td>${celulas}</tr>`;
  }).join('') || `<tr><td colspan="${porMes.length+1}">Sem membros cadastrados.</td></tr>`;

  document.getElementById('tabela-comparativo').innerHTML = cabecalho + `<tbody>${linhas}</tbody>`;
}

// ---------- utilidades ----------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

checarSessao();
