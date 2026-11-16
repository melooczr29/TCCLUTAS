// Regras de negocio: aptidao ao exame de faixa (RF-04).
//
// O resultado e APOIO A DECISAO do mestre. Ele nao aprova nem bloqueia
// ninguem: o lancamento do exame (RF-05) e sempre uma decisao do professor.
import { one, q } from '../db.js';

// Faixas validas para um aluno: as da academia, se ela configurou a
// modalidade; senao, as padrao da plataforma.
export async function faixasDaModalidade(academyId, modalityId) {
  const proprias = await q(
    'SELECT * FROM belts WHERE academy_id = $1 AND modality_id = $2 ORDER BY sort_order',
    [academyId, modalityId],
  );
  if (proprias.length) return proprias;
  return q(
    'SELECT * FROM belts WHERE academy_id IS NULL AND modality_id = $1 ORDER BY sort_order',
    [modalityId],
  );
}

export async function calcularAptidao(student) {
  const faixas = await faixasDaModalidade(student.academy_id, student.modality_id);
  const atual = faixas.find((f) => f.id === student.belt_id) || faixas[0] || null;
  const proxima = atual ? faixas.find((f) => f.sort_order > atual.sort_order) || null : null;

  // A contagem recomeca a cada graduacao aprovada.
  const ultima = await one(
    `SELECT exam_date FROM graduations
      WHERE student_id = $1 AND result = 'aprovado'
      ORDER BY exam_date DESC, created_at DESC LIMIT 1`,
    [student.id],
  );
  const desde = ultima?.exam_date ?? null;
  const { n: presencas } = await one(
    `SELECT count(*) AS n FROM attendance
      WHERE student_id = $1 AND ($2::date IS NULL OR class_date > $2::date)`,
    [student.id, desde],
  );

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

  const exigidas = proxima?.required_classes ?? 0;
  const frequenciaOk = !!proxima && presencas >= exigidas;
  const tecnicasOk = !!proxima && tecnicas.validadas >= tecnicas.exigidas;
  return {
    faixa_atual: atual && { id: atual.id, name: atual.name, color: atual.color },
    proxima_faixa: proxima && { id: proxima.id, name: proxima.name, color: proxima.color },
    contagem_desde: desde,
    presencas,
    presencas_exigidas: exigidas,
    percentual_frequencia: exigidas ? Math.min(100, Math.round((presencas / exigidas) * 100)) : 100,
    tecnicas_exigidas: tecnicas.exigidas,
    tecnicas_validadas: tecnicas.validadas,
    frequencia_ok: frequenciaOk,
    tecnicas_ok: tecnicasOk,
    sugestao_apto: frequenciaOk && tecnicasOk,
    observacao: 'Indicador de apoio. A decisão sobre o exame é do mestre.',
  };
}
