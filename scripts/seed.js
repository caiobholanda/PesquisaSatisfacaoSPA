import 'dotenv/config';
import { initDb, inserirFeedback } from '../src/db.js';

initDb();

const nomes = ['Ana Carolina Mendes','Lucas Ferreira','Beatriz Oliveira','Rafael Costa','Mariana Alves','Pedro Henrique Santos','Juliana Lima','Thiago Rocha','Camila Souza','Fernando Nunes','Isabela Castro','Rodrigo Freitas','Fernanda Machado','Gustavo Pereira','Larissa Barbosa','Eduardo Correia','Sofia Moreira','Matheus Araújo','Letícia Dias','Carlos Eduardo Silva'];
const emails = nomes.map(n => n.toLowerCase().replace(/\s+/g,'.')  .normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z.]/g,'') + '@email.com');
const tratamentos = ['Massagem relaxante','Pedras quentes','Drenagem linfática','Esfoliação corporal','Aromaterapia','Reflexologia','Shiatsu','Massagem desportiva'];
const massoterapeuta = ['Carla Sousa','Jéssica Lima','Andreia Mota','Fernanda Costa','Priscila Alves'];
const notas = ['otimo','otimo','otimo','bom','bom','regular','ruim'];
const tipos = ['hospede_hotel','visitante'];
const origens = ['hospede','hospede','hospede','colaborador'];

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function daysAgo(n) {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().replace('T',' ').slice(0,19);
}

for (let i = 0; i < 20; i++) {
  inserirFeedback({
    nome: nomes[i],
    apto: Math.random() > .5 ? String(Math.floor(Math.random()*400)+100) : null,
    email: emails[i],
    telefone: Math.random() > .5 ? `(85) 9${String(Math.floor(Math.random()*90000000+10000000))}` : null,
    data_tratamento: daysAgo(Math.floor(Math.random()*60+1)).slice(0,10),
    tratamento_realizado: rnd(tratamentos),
    nome_massoterapeuta: rnd(massoterapeuta),
    servicos_expectativa: rnd(notas),
    servicos_explicacao: rnd(notas),
    servicos_atitude: rnd(notas),
    servicos_tecnica: rnd(notas),
    servicos_comentario: Math.random() > .6 ? ['Atendimento excelente!','Profissional muito atenciosa.','Ambiente muito agradável e relaxante.','Superou minhas expectativas.','Voltarei com certeza!'][Math.floor(Math.random()*5)] : null,
    instalacoes_conforto: rnd(notas),
    instalacoes_organizacao: rnd(notas),
    instalacoes_conveniencia: rnd(notas),
    instalacoes_comentario: Math.random() > .7 ? ['Espaço impecável.','Muito bem organizado.','Aromas deliciosos no ambiente.'][Math.floor(Math.random()*3)] : null,
    recomenda: Math.random() > .2 ? 'sim' : 'nao',
    recomenda_qual: Math.random() > .5 ? 'Família e amigos' : null,
    recomenda_porque: Math.random() > .6 ? 'Qualidade excepcional do serviço' : null,
    tipo_cliente: rnd(tipos),
    origem: rnd(origens),
    ip_address: '127.0.0.1',
    user_agent: 'seed-script',
    submitted_at: daysAgo(Math.floor(Math.random()*60)),
  });
}

console.log('✅ 20 feedbacks inseridos com sucesso.');
