import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'feedback.db');

let _db = null;

export function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

export function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      apto TEXT,
      email TEXT NOT NULL,
      telefone TEXT,
      data_tratamento TEXT,
      tratamento_realizado TEXT,
      nome_massoterapeuta TEXT,
      servicos_expectativa TEXT,
      servicos_explicacao TEXT,
      servicos_atitude TEXT,
      servicos_tecnica TEXT,
      servicos_comentario TEXT,
      instalacoes_conforto TEXT,
      instalacoes_organizacao TEXT,
      instalacoes_conveniencia TEXT,
      instalacoes_comentario TEXT,
      recomenda TEXT,
      recomenda_qual TEXT,
      recomenda_porque TEXT,
      tipo_cliente TEXT,
      origem TEXT NOT NULL DEFAULT 'hospede',
      ip_address TEXT,
      user_agent TEXT,
      submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_feedback_submitted ON feedback(submitted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_feedback_origem ON feedback(origem);
    CREATE INDEX IF NOT EXISTS idx_feedback_tipo_cliente ON feedback(tipo_cliente);

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'TrocarEmProducao!';
  const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(adminUser);
  if (!existing) {
    const hash = bcrypt.hashSync(adminPass, 10);
    db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(adminUser, hash);
    console.log(`[DB] Admin criado: ${adminUser} — TROQUE A SENHA EM PRODUÇÃO`);
  }
}

export function inserirFeedback(dados) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO feedback (
      nome, apto, email, telefone, data_tratamento, tratamento_realizado,
      nome_massoterapeuta, servicos_expectativa, servicos_explicacao,
      servicos_atitude, servicos_tecnica, servicos_comentario,
      instalacoes_conforto, instalacoes_organizacao, instalacoes_conveniencia,
      instalacoes_comentario, recomenda, recomenda_qual, recomenda_porque,
      tipo_cliente, origem, ip_address, user_agent, submitted_at
    ) VALUES (
      @nome, @apto, @email, @telefone, @data_tratamento, @tratamento_realizado,
      @nome_massoterapeuta, @servicos_expectativa, @servicos_explicacao,
      @servicos_atitude, @servicos_tecnica, @servicos_comentario,
      @instalacoes_conforto, @instalacoes_organizacao, @instalacoes_conveniencia,
      @instalacoes_comentario, @recomenda, @recomenda_qual, @recomenda_porque,
      @tipo_cliente, @origem, @ip_address, @user_agent, @submitted_at
    )
  `);
  return stmt.run(dados).lastInsertRowid;
}

export function listarFeedback({ origem, tipo_cliente, from, to, limit = 50, offset = 0 } = {}) {
  const db = getDb();
  const conds = [];
  const params = [];

  if (origem) { conds.push('origem = ?'); params.push(origem); }
  if (tipo_cliente) { conds.push('tipo_cliente = ?'); params.push(tipo_cliente); }
  if (from) { conds.push("submitted_at >= ?"); params.push(from + ' 00:00:00'); }
  if (to) { conds.push("submitted_at <= ?"); params.push(to + ' 23:59:59'); }

  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) as t FROM feedback ${where}`).get(...params).t;
  const items = db.prepare(`SELECT * FROM feedback ${where} ORDER BY submitted_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  return { total, items };
}

const NOTA_MAP = { otimo: 4, bom: 3, regular: 2, ruim: 1 };
function notaNum(v) { return NOTA_MAP[v] ?? null; }
function avgNotas(items, campo) {
  const vals = items.map(r => notaNum(r[campo])).filter(v => v !== null);
  if (!vals.length) return null;
  return +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
}

export function statsFeedback({ from, to } = {}) {
  const db = getDb();
  const conds = [];
  const params = [];

  const dfrom = from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const dto = to || new Date().toISOString().slice(0, 10);
  conds.push("submitted_at >= ?"); params.push(dfrom + ' 00:00:00');
  conds.push("submitted_at <= ?"); params.push(dto + ' 23:59:59');
  const where = 'WHERE ' + conds.join(' AND ');

  const total = db.prepare(`SELECT COUNT(*) as t FROM feedback ${where}`).get(...params).t;
  const porOrigem = db.prepare(`SELECT origem, COUNT(*) as t FROM feedback ${where} GROUP BY origem`).all(...params);
  const porTipo = db.prepare(`SELECT tipo_cliente, COUNT(*) as t FROM feedback ${where} GROUP BY tipo_cliente`).all(...params);
  const recomenda = db.prepare(`SELECT recomenda, COUNT(*) as t FROM feedback ${where} GROUP BY recomenda`).all(...params);
  const items = db.prepare(`SELECT * FROM feedback ${where}`).all(...params);

  const medias = {
    servicos_expectativa: avgNotas(items, 'servicos_expectativa'),
    servicos_explicacao: avgNotas(items, 'servicos_explicacao'),
    servicos_atitude: avgNotas(items, 'servicos_atitude'),
    servicos_tecnica: avgNotas(items, 'servicos_tecnica'),
    instalacoes_conforto: avgNotas(items, 'instalacoes_conforto'),
    instalacoes_organizacao: avgNotas(items, 'instalacoes_organizacao'),
    instalacoes_conveniencia: avgNotas(items, 'instalacoes_conveniencia'),
  };

  const todasNotas = Object.values(medias).filter(v => v !== null);
  const mediaGeral = todasNotas.length ? +(todasNotas.reduce((a, b) => a + b, 0) / todasNotas.length).toFixed(2) : null;

  const recSim = recomenda.find(r => r.recomenda === 'sim')?.t || 0;
  const pctRecomenda = total > 0 ? +(recSim / total * 100).toFixed(1) : 0;

  const comentarios = items
    .filter(r => r.servicos_comentario || r.instalacoes_comentario)
    .slice(0, 10)
    .map(r => ({ id: r.id, nome: r.nome, servicos: r.servicos_comentario, instalacoes: r.instalacoes_comentario, submitted_at: r.submitted_at }));

  return { total, periodo: { from: dfrom, to: dto }, porOrigem, porTipo, recomenda, medias, mediaGeral, pctRecomenda, comentarios };
}

export function buscarAdmin(username) {
  return getDb().prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
}

export function exportarCsv({ origem, tipo_cliente, from, to } = {}) {
  const { items } = listarFeedback({ origem, tipo_cliente, from, to, limit: 9999, offset: 0 });
  return items;
}
