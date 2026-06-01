import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { buscarAdmin } from '../db.js';

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

export default router;
