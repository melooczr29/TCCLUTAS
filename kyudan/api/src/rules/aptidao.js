// Regras de negocio: aptidao ao exame de faixa (RF-04) e ciclo de graduacao.
//
// Os 3 requisitos do PGT: presencas no ciclo, tempo na faixa atual e
// percentual de tecnicas validadas pelo professor. A idade regulamentar,
// quando configurada, so gera alerta.
//
// O resultado e APOIO A DECISAO do professor. Ele nao aprova nem bloqueia
// ninguem: aprovar um aluno nao sinalizado e permitido, com confirmacao e
// registro na auditoria (RF-05).
import { one, q } from '../db.js';

// Faixas de uma modalidade com os requisitos validos para a academia:
// os configurados por ela (RF-10) ou, na falta, os padroes da plataforma.
export async function faixasDaModalidade(academyId, modalityId) {
  return q(
    `SELECT b.id, b.modality_id, b.name, b.color, b.sort_order,
            COALESCE(s.min_classes,  b.min_classes)  AS min_classes,
            COALESCE(s.min_months,   b.min_months)   AS min_months,
            CASE WHEN s.belt_id IS NULL THEN b.min_age ELSE s.min_age END AS min_age,
            COALESCE(s.min_tech_pct, b.min_tech_pct) AS min_tech_pct,
            (s.belt_id IS NOT NULL) AS personalizada
       FROM belts b
       LEFT JOIN belt_settings s ON s.belt_id = b.id AND s.academy_id = $1
      WHERE b.modality_id = $2
      ORDER BY b.sort_order`,
    [academyId, modalityId],
  );
}

function mesesEntre(inicio, fim) {
  const a = new Date(`${inicio}T12:00:00`);
  const b = new Date(`${fim}T12:00:00`);
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m -= 1;
  return Math.max(0, m);
}
const idadeEm = (nascimento, data) => (nascimento ? Math.floor(mesesEntre(nascimento, data) / 12) : null);
export const hoje = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

// enrollment: linha de enrollments; student: linha de students.
export async function calcularAptidao(enrollment, student) {
  const faixas = await faixasDaModalidade(student.academy_id, enrollment.modality_id);
  const atual = faixas.find((f) => f.id === enrollment.belt_id) || faixas[0];
  const proxima = faixas.find((f) => f.sort_order > atual.sort_order) || null;
  const dataHoje = hoje();

  // O ciclo comeca na obtencao da faixa atual e recomeca a cada exame
  // reprovado (RF-05, passo 4).
  const ultimaReprovacao = await one(
    `SELECT exam_date FROM graduations g WHERE g.enrollment_id = $1 AND g.result = 'reprovado'
        AND g.created_at > COALESCE((SELECT max(created_at) FROM graduations
                                      WHERE enrollment_id = $1 AND result = 'aprovado'), '-infinity')
      ORDER BY exam_date DESC, created_at DESC LIMIT 1`,
    [enrollment.id],
  );
  const inicioCiclo = ultimaReprovacao && ultimaReprovacao.exam_date >= enrollment.belt_since
    ? ultimaReprovacao.exam_date : null;

  // Presencas creditadas apenas a modalidade da turma (RF-20, passo 3).
  const { n: presencas } = await one(
    `SELECT count(*) AS n FROM attendance a
       JOIN lessons l ON l.id = a.lesson_id
       JOIN classes c ON c.id = l.class_id
      WHERE a.student_id = $1 AND c.modality_id = $2
        AND ($3::date IS NULL AND l.lesson_date >= $4::date
             OR $3::date IS NOT NULL AND l.lesson_date > $3::date)`,
    [student.id, enrollment.modality_id, inicioCiclo, enrollment.belt_since],
  );

  const meses = mesesEntre(enrollment.belt_since, dataHoje);

  let tecnicas = { exigidas: 0, validadas: 0 };
  if (proxima) {
    tecnicas = await one(
      `SELECT count(*) AS exigidas,
              count(*) FILTER (WHERE sp.status = 'validada') AS validadas
         FROM techniques t
         LEFT JOIN skill_progress sp ON sp.technique_id = t.id AND sp.student_id = $1
        WHERE t.required_for_belt_id = $2`,
      [student.id, proxima.id],
    );
  }
  const pctTecnicas = tecnicas.exigidas ? Math.round((tecnicas.validadas / tecnicas.exigidas) * 100) : 100;

  const req = proxima && {
    presencas: { atual: presencas, exigido: proxima.min_classes, ok: presencas >= proxima.min_classes },
    meses: { atual: meses, exigido: proxima.min_months, ok: meses >= proxima.min_months },
    tecnicas: {
      atual: pctTecnicas, exigido: proxima.min_tech_pct, ok: pctTecnicas >= proxima.min_tech_pct,
      validadas: tecnicas.validadas, total: tecnicas.exigidas,
    },
  };

  const alertas = [];
  const idade = idadeEm(student.birth_date, dataHoje);
  if (proxima?.min_age != null && (idade == null || idade < proxima.min_age)) {
    alertas.push(idade == null
      ? `A faixa ${proxima.name} exige idade mínima de ${proxima.min_age} anos e a data de nascimento não foi informada.`
      : `A faixa ${proxima.name} exige idade mínima de ${proxima.min_age} anos; o aluno tem ${idade}.`);
  }

  return {
    modality_id: enrollment.modality_id,
    faixa_atual: { id: atual.id, name: atual.name, color: atual.color, desde: enrollment.belt_since },
    proxima_faixa: proxima && { id: proxima.id, name: proxima.name, color: proxima.color },
    inicio_ciclo: inicioCiclo || enrollment.belt_since,
    ciclo_reiniciado_por_exame: !!inicioCiclo,
    requisitos: req,
    sugestao_apto: !!req && req.presencas.ok && req.meses.ok && req.tecnicas.ok,
    alertas,
    observacao: 'Indicador de apoio. A indicação ao exame é decisão do professor.',
  };
}

export { idadeEm };
