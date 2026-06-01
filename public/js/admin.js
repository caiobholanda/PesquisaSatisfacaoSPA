const TOKEN_KEY = 'granspa_token';
const LIMIT = 30;
let _token = null;
let _offset = 0;
let _total = 0;
let _filters = {};

function token() { return _token || sessionStorage.getItem(TOKEN_KEY); }
function setToken(t) { _token = t; sessionStorage.setItem(TOKEN_KEY, t); }
function clearToken() { _token = null; sessionStorage.removeItem(TOKEN_KEY); }

async function api(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
    ...opts,
  });
  if (res.status === 401) { logout(); return null; }
  return res;
}

function logout() { clearToken(); showLogin(); }

function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app-screen').style.display = 'none';
}
function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-screen').style.display = 'block';
}

// ── Login ──
document.getElementById('btn-login').addEventListener('click', async () => {
  const btn = document.getElementById('btn-login');
  const msg = document.getElementById('msg-login');
  const username = document.getElementById('inp-user').value.trim();
  const password = document.getElementById('inp-pass').value;
  if (!username || !password) { msg.textContent = 'Preencha usuário e senha.'; return; }
  btn.innerHTML = '<span class="spinner"></span>';
  btn.disabled = true;
  msg.textContent = '';
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const d = await res.json();
    if (d.ok) { setToken(d.token); showApp(); loadAll(); }
    else { msg.textContent = d.error || 'Credenciais inválidas'; }
  } catch { msg.textContent = 'Erro de conexão.'; }
  finally { btn.innerHTML = 'Entrar'; btn.disabled = false; }
});
document.getElementById('inp-pass').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btn-login').click(); });
document.getElementById('btn-sair').addEventListener('click', logout);

// ── Stats ──
async function loadStats() {
  const params = new URLSearchParams();
  if (_filters.from) params.set('from', _filters.from);
  if (_filters.to) params.set('to', _filters.to);
  const res = await api(`/api/feedback/stats?${params}`);
  if (!res) return;
  const d = await res.json();
  if (!d.ok) return;
  document.getElementById('kpi-total').textContent = d.total;
  document.getElementById('kpi-media').textContent = d.mediaGeral != null ? d.mediaGeral.toFixed(2) : '—';
  document.getElementById('kpi-recomenda').textContent = d.pctRecomenda != null ? d.pctRecomenda + '%' : '—';
  const h = d.porOrigem.find(r => r.origem === 'hospede')?.t || 0;
  const c = d.porOrigem.find(r => r.origem === 'colaborador')?.t || 0;
  document.getElementById('kpi-origem').innerHTML = `<span style="color:var(--gold)">${h}</span> / <span style="color:#818CF8">${c}</span>`;
}

// ── Table ──
const NOTA_MAP = { otimo: 4, bom: 3, regular: 2, ruim: 1 };
function avgRow(r) {
  const campos = ['servicos_expectativa','servicos_explicacao','servicos_atitude','servicos_tecnica','instalacoes_conforto','instalacoes_organizacao','instalacoes_conveniencia'];
  const vals = campos.map(c => NOTA_MAP[r[c]]).filter(Boolean);
  if (!vals.length) return null;
  return (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2);
}
function scoreClass(v) { if (v == null) return ''; return v >= 3.5 ? 'score-green' : v >= 2.5 ? 'score-yellow' : 'score-red'; }
function fmtDate(s) { if (!s) return '—'; return s.slice(0,10).split('-').reverse().join('/'); }

async function loadTable() {
  const params = new URLSearchParams({ limit: LIMIT, offset: _offset });
  if (_filters.from) params.set('from', _filters.from);
  if (_filters.to) params.set('to', _filters.to);
  if (_filters.origem) params.set('origem', _filters.origem);
  if (_filters.tipo) params.set('tipo_cliente', _filters.tipo);
  const res = await api(`/api/feedback?${params}`);
  if (!res) return;
  const d = await res.json();
  if (!d.ok) return;
  _total = d.total;

  document.getElementById('tbl-count').textContent = `${d.total} resultado${d.total !== 1 ? 's' : ''}`;

  const tbody = document.getElementById('tbl-body');
  const empty = document.getElementById('tbl-empty');

  // client-side busca por nome/email
  const busca = (document.getElementById('f-busca').value || '').toLowerCase();
  let items = d.items;
  if (busca) items = items.filter(r => r.nome?.toLowerCase().includes(busca) || r.email?.toLowerCase().includes(busca));

  if (!items.length) { tbody.innerHTML = ''; empty.style.display = ''; }
  else {
    empty.style.display = 'none';
    tbody.innerHTML = items.map(r => {
      const avg = avgRow(r);
      return `<tr>
        <td>${fmtDate(r.submitted_at)}</td>
        <td style="font-weight:500">${r.nome}</td>
        <td style="color:var(--muted)">${r.email}</td>
        <td style="color:var(--muted)">${r.tipo_cliente || '—'}</td>
        <td><span class="badge ${r.origem === 'hospede' ? 'badge-hospede' : 'badge-colab'}">${r.origem === 'hospede' ? 'Hóspede' : 'Colaborador'}</span></td>
        <td class="${scoreClass(avg)}">${avg ?? '—'}</td>
        <td><button class="btn btn-outline btn-sm" onclick="openDrawer(${r.id})">Ver</button></td>
      </tr>`;
    }).join('');
  }

  // Paginação
  const pages = Math.ceil(_total / LIMIT);
  const cur = Math.floor(_offset / LIMIT) + 1;
  const pag = document.getElementById('pagination');
  if (pages <= 1) { pag.innerHTML = ''; return; }
  pag.innerHTML = `
    <button class="btn btn-outline btn-sm" ${_offset === 0 ? 'disabled' : ''} onclick="goPage(${_offset - LIMIT})">←</button>
    <span>Página ${cur} de ${pages}</span>
    <button class="btn btn-outline btn-sm" ${_offset + LIMIT >= _total ? 'disabled' : ''} onclick="goPage(${_offset + LIMIT})">→</button>`;
}

window.goPage = (o) => { _offset = o; loadTable(); };

// ── Drawer ──
let _allItems = [];
async function openDrawer(id) {
  const res = await api(`/api/feedback?limit=9999&offset=0`);
  if (!res) return;
  const d = await res.json();
  const r = d.items.find(i => i.id === id);
  if (!r) return;

  function nota(v) {
    if (!v) return '<span style="color:var(--muted)">—</span>';
    const cls = { otimo:'nota-otimo', bom:'nota-bom', regular:'nota-regular', ruim:'nota-ruim' }[v] || '';
    const label = { otimo:'Ótimo', bom:'Bom', regular:'Regular', ruim:'Ruim' }[v] || v;
    return `<span class="nota-pill ${cls}">${label}</span>`;
  }
  function row(k, v) { return `<div class="detail-row"><span class="detail-key">${k}</span><span>${v || '<span style="color:var(--muted)">—</span>'}</span></div>`; }

  document.getElementById('drawer-content').innerHTML = `
    <div class="detail-section">
      <h3>Identificação</h3>
      ${row('Nome', r.nome)} ${row('E-mail', r.email)} ${row('Apto', r.apto)}
      ${row('Telefone', r.telefone)} ${row('Tipo', r.tipo_cliente)}
      <div class="detail-row"><span class="detail-key">Origem</span><span class="badge ${r.origem==='hospede'?'badge-hospede':'badge-colab'}">${r.origem==='hospede'?'Hóspede':'Colaborador'}</span></div>
      ${row('Data avaliação', fmtDate(r.submitted_at))}
    </div>
    <div class="detail-section">
      <h3>Tratamento</h3>
      ${row('Data tratamento', fmtDate(r.data_tratamento))} ${row('Tratamento', r.tratamento_realizado)} ${row('Massoterapista', r.nome_massoterapeuta)}
    </div>
    <div class="detail-section">
      <h3>Serviços</h3>
      <div class="detail-row"><span class="detail-key">Expectativa</span>${nota(r.servicos_expectativa)}</div>
      <div class="detail-row"><span class="detail-key">Explicação</span>${nota(r.servicos_explicacao)}</div>
      <div class="detail-row"><span class="detail-key">Atitude</span>${nota(r.servicos_atitude)}</div>
      <div class="detail-row"><span class="detail-key">Técnica</span>${nota(r.servicos_tecnica)}</div>
      ${r.servicos_comentario ? `<div class="detail-row"><span class="detail-key">Comentário</span><span style="font-style:italic;color:var(--muted)">"${r.servicos_comentario}"</span></div>` : ''}
    </div>
    <div class="detail-section">
      <h3>Instalações</h3>
      <div class="detail-row"><span class="detail-key">Conforto</span>${nota(r.instalacoes_conforto)}</div>
      <div class="detail-row"><span class="detail-key">Organização</span>${nota(r.instalacoes_organizacao)}</div>
      <div class="detail-row"><span class="detail-key">Conveniência</span>${nota(r.instalacoes_conveniencia)}</div>
      ${r.instalacoes_comentario ? `<div class="detail-row"><span class="detail-key">Comentário</span><span style="font-style:italic;color:var(--muted)">"${r.instalacoes_comentario}"</span></div>` : ''}
    </div>
    <div class="detail-section">
      <h3>Recomendação</h3>
      ${row('Recomenda?', r.recomenda)} ${row('Para quem', r.recomenda_qual)} ${row('Por quê', r.recomenda_porque)}
    </div>`;

  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawer-overlay').classList.add('open');
}
window.openDrawer = openDrawer;

document.getElementById('btn-close-drawer').addEventListener('click', closeDrawer);
document.getElementById('drawer-overlay').addEventListener('click', closeDrawer);
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
}

// ── Filtros ──
document.getElementById('btn-filtrar').addEventListener('click', () => {
  _filters = {
    from: document.getElementById('f-from').value,
    to: document.getElementById('f-to').value,
    origem: document.getElementById('f-origem').value,
    tipo: document.getElementById('f-tipo').value,
  };
  _offset = 0;
  loadAll();
});

// ── Exportar CSV ──
document.getElementById('btn-exportar').addEventListener('click', () => {
  const params = new URLSearchParams({ format: 'csv' });
  if (_filters.from) params.set('from', _filters.from);
  if (_filters.to) params.set('to', _filters.to);
  if (_filters.origem) params.set('origem', _filters.origem);
  if (_filters.tipo) params.set('tipo_cliente', _filters.tipo);
  const url = `/api/feedback?${params}`;
  const a = document.createElement('a');
  a.href = url;
  a.click();
});

function loadAll() { loadStats(); loadTable(); }

// ── Init ──
(function init() {
  const t = token();
  if (t) { showApp(); loadAll(); }
  else { showLogin(); }

  // Default dates: últimos 30 dias
  const hoje = new Date();
  const d30 = new Date(Date.now() - 30 * 86400000);
  document.getElementById('f-to').value = hoje.toISOString().slice(0,10);
  document.getElementById('f-from').value = d30.toISOString().slice(0,10);
})();
