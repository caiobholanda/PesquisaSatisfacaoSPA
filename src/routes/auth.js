import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { buscarAdmin, listarAdmins, inserirAdmin, deletarAdmin } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ ok: false, error: 'Usuário e senha obrigatórios' });

  const admin = buscarAdmin(username);
  const valido = admin && bcrypt.compareSync(password, admin.password_hash);

  if (!valido) {
    await new Promise(r => setTimeout(r, 500));
    return res.status(401).json({ ok: false, error: 'Credenciais inválidas' });
  }

  const token = jwt.sign(
    { sub: admin.id, username: admin.username },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
  return res.json({ ok: true, token });
});

// GET /api/auth/usuarios — lista admins (protegido)
router.get('/usuarios', requireAuth, (req, res) => {
  res.json({ ok: true, items: listarAdmins() });
});

// POST /api/auth/usuarios — cria admin (protegido)
router.post('/usuarios', requireAuth, async (req, res) => {
  const { username, senha } = req.body || {};
  if (!username?.trim() || !senha)
    return res.status(400).json({ ok: false, error: 'Usuário e senha obrigatórios' });
  if (buscarAdmin(username.trim()))
    return res.status(409).json({ ok: false, error: 'Usuário já existe' });
  const hash = bcrypt.hashSync(senha, 10);
  const id = inserirAdmin(username.trim(), hash);
  res.status(201).json({ ok: true, id });
});

// DELETE /api/auth/usuarios/:id — remove admin (protegido)
router.delete('/usuarios/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
  const total = listarAdmins().length;
  if (total <= 1) return res.status(400).json({ ok: false, error: 'Não é possível remover o único usuário' });
  const changes = deletarAdmin(id);
  if (!changes) return res.status(404).json({ ok: false, error: 'Não encontrado' });
  res.json({ ok: true });
});

export default router;
