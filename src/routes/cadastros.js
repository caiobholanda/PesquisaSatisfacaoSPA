import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listarMassagistas, listarMassagistasComStats,
  inserirMassagista, atualizarMassagista, deletarMassagista,
  listarTiposMassagem, inserirTipoMassagem, atualizarTipoMassagem, deletarTipoMassagem,
  historicoMassagista,
} from '../db.js';

const router = Router();
router.use(requireAuth);

// ── Massagistas ──
router.get('/massagistas', (_req, res) => res.json({ ok: true, items: listarMassagistasComStats() }));

router.post('/massagistas', (req, res) => {
  const { nome, matricula, especialidade_original, funcao, vinculo, bilingue, disponibilidade } = req.body || {};
  if (!nome?.trim()) return res.status(400).json({ ok: false, error: 'Nome obrigatório' });
  const id = inserirMassagista(nome, {
    matricula: matricula?.trim() || null,
    especialidade_original: especialidade_original?.trim() || null,
    funcao: funcao?.trim() || 'Massoterapeuta',
    vinculo: vinculo?.trim() || null,
    bilingue: bilingue ? 1 : 0,
    disponibilidade: disponibilidade ? (typeof disponibilidade === 'string' ? disponibilidade : JSON.stringify(disponibilidade)) : null,
  });
  res.status(201).json({ ok: true, id });
});

router.put('/massagistas/:id', (req, res) => {
  const { nome, ativo = 1, matricula, especialidade_original, funcao, vinculo, bilingue, disponibilidade } = req.body || {};
  if (!nome?.trim()) return res.status(400).json({ ok: false, error: 'Nome obrigatório' });
  const opts = {};
  if (matricula !== undefined) opts.matricula = matricula?.trim() || null;
  if (especialidade_original !== undefined) opts.especialidade_original = especialidade_original?.trim() || null;
  if (funcao !== undefined) opts.funcao = funcao?.trim() || 'Massoterapeuta';
  if (vinculo !== undefined) opts.vinculo = vinculo?.trim() || null;
  if (bilingue !== undefined) opts.bilingue = bilingue ? 1 : 0;
  if (disponibilidade !== undefined) opts.disponibilidade = disponibilidade ? (typeof disponibilidade === 'string' ? disponibilidade : JSON.stringify(disponibilidade)) : null;
  const changes = atualizarMassagista(parseInt(req.params.id), nome, ativo ? 1 : 0, opts);
  if (!changes) return res.status(404).json({ ok: false, error: 'Não encontrado' });
  res.json({ ok: true });
});

router.get('/massagistas/:id/historico', (req, res) => {
  const m = listarMassagistas().find(m => m.id === parseInt(req.params.id));
  if (!m) return res.status(404).json({ ok: false, error: 'Não encontrado' });
  const items = historicoMassagista(m.nome);
  res.json({ ok: true, massagista: m, items });
});

router.delete('/massagistas/:id', (req, res) => {
  const changes = deletarMassagista(parseInt(req.params.id));
  if (!changes) return res.status(404).json({ ok: false, error: 'Não encontrado' });
  res.json({ ok: true });
});

// ── Tipos de Massagem ──
router.get('/tipos-massagem', (_req, res) => res.json({ ok: true, items: listarTiposMassagem() }));

router.post('/tipos-massagem', (req, res) => {
  const { nome, duracao_min, preco, descricao } = req.body || {};
  if (!nome?.trim()) return res.status(400).json({ ok: false, error: 'Nome obrigatório' });
  const id = inserirTipoMassagem(nome, duracao_min, preco, descricao);
  res.status(201).json({ ok: true, id });
});

router.put('/tipos-massagem/:id', (req, res) => {
  const { nome, duracao_min, preco, ativo = 1, descricao } = req.body || {};
  if (!nome?.trim()) return res.status(400).json({ ok: false, error: 'Nome obrigatório' });
  const changes = atualizarTipoMassagem(parseInt(req.params.id), nome, duracao_min, preco, ativo ? 1 : 0, descricao);
  if (!changes) return res.status(404).json({ ok: false, error: 'Não encontrado' });
  res.json({ ok: true });
});

router.delete('/tipos-massagem/:id', (req, res) => {
  const changes = deletarTipoMassagem(parseInt(req.params.id));
  if (!changes) return res.status(404).json({ ok: false, error: 'Não encontrado' });
  res.json({ ok: true });
});

export default router;
