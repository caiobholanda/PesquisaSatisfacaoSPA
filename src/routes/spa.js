import { Router } from 'express';
import { buscarDocumentoToken, inserirSpaPerfil, vincularDocumentoToken } from '../db.js';

const router = Router();

const LOCALES_VALIDOS = ['pt-BR', 'pt-PT', 'en', 'fr', 'es', 'it', 'de'];

function san(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim().slice(0, 1000);
}

// GET /api/spa/documento?t=TOKEN
router.get('/documento', (req, res) => {
  const token = req.query.t;
  if (!token) return res.status(400).json({ ok: false, error: 'Token ausente' });
  const row = buscarDocumentoToken(token);
  if (!row) return res.status(404).json({ ok: false, error: 'Token inválido ou expirado' });
  res.json({
    hospede_nome:  row.hospede_nome  || '',
    hospede_email: row.hospede_email || '',
    servico:       row.servico       || '',
    locale:        LOCALES_VALIDOS.includes(row.locale) ? row.locale : 'pt-BR',
  });
});

// POST /api/spa/perfil
router.post('/perfil', (req, res) => {
  const b = req.body || {};
  const nome = san(b.nome);
  const sobrenome = san(b.sobrenome);
  if (!nome || !sobrenome) return res.status(400).json({ ok: false, error: 'Nome obrigatório' });

  const locale = LOCALES_VALIDOS.includes(b.idioma) ? b.idioma : 'pt-BR';

  // Resolve reserva_id via documento_token
  let reserva_id = null;
  if (b.documento_token) {
    const row = buscarDocumentoToken(b.documento_token);
    if (row) {
      reserva_id = row.reserva_id;
      if (locale) vincularDocumentoToken(reserva_id, locale);
    }
  }

  try {
    const id = inserirSpaPerfil({
      nome, sobrenome,
      tipo_documento:         san(b.tipo_documento) || 'cpf',
      documento:              san(b.documento),
      email:                  san(b.email),
      telefone:               san(b.telefone),
      data_nascimento:        san(b.data_nascimento) || null,
      rotina_facial:          b.rotina_facial ? JSON.stringify(b.rotina_facial) : null,
      rotina_corporal:        b.rotina_corporal ? JSON.stringify(b.rotina_corporal) : null,
      produto_especifico:     san(b.produto_especifico) || null,
      pressao_massagem:       san(b.pressao_massagem) || null,
      info_medica:            san(b.info_medica),
      consentimento_saude:    !!b.consentimento_saude,
      consentimento_marketing:!!b.consentimento_marketing,
      canais_marketing:       b.canais_marketing ? JSON.stringify(b.canais_marketing) : null,
      assinatura_data_url:    san(b.assinatura_data_url).slice(0, 200000) || null,
      idioma:                 locale,
      reserva_id,
    });
    res.json({ ok: true, id });
  } catch (err) {
    console.error('spa/perfil error:', err);
    res.status(500).json({ ok: false, error: 'Erro ao salvar' });
  }
});

export default router;
