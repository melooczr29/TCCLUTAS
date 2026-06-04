/**
 * ============================================================================
 * presencaCodigo — Empacota/desempacota o "código de presença" da aula
 * ----------------------------------------------------------------------------
 * [O QUE FAZ]  Junta (qrToken, senseiId, dataAula) num único texto e separa.
 * [POR QUE EXISTE]  O backend exige os 3 dados; um único código é mais fácil de
 *                   compartilhar (no nativo viraria um QR Code visual).
 * [PARA QUE SERVE]  O Sensei mostra 1 código; o Aluno cola 1 código.
 * ----------------------------------------------------------------------------
 * Usamos "~~" como separador porque NÃO aparece no qrToken (base64url + ponto),
 * nem no UUID do sensei, nem na data ISO. Assim a separação é segura.
 * ============================================================================
 */

// [O QUE FAZ] Separador improvável de colidir com o conteúdo dos campos.
// [POR QUE EXISTE] Precisamos dividir o código sem ambiguidade.
// [PARA QUE SERVE] Reconstituir exatamente os 3 valores originais.
const SEP = '~~';

// [O QUE FAZ] Une os 3 dados num único código compartilhável.
// [POR QUE EXISTE] Simplifica a transferência do Sensei para o Aluno.
// [PARA QUE SERVE] Gera o texto exibido na tela do Sensei.
export function encodePresencaCodigo(qrToken: string, senseiId: string, dataAula: string): string {
  return [qrToken, senseiId, dataAula].join(SEP);
}

// [O QUE FAZ] Resultado da tentativa de leitura do código.
// [POR QUE EXISTE] Sinalizar sucesso/erro de forma tipada.
// [PARA QUE SERVE] A tela do Aluno decide se prossegue ou mostra erro.
export interface PresencaCodigoDecoded {
  ok: boolean;
  qrToken?: string;
  senseiId?: string;
  dataAula?: string;
}

// [O QUE FAZ] Separa o código colado de volta nos 3 campos.
// [POR QUE EXISTE] O backend recebe os campos separadamente.
// [PARA QUE SERVE] Permite validar e enviar o check-in corretamente.
export function decodePresencaCodigo(codigo: string): PresencaCodigoDecoded {
  const parts = codigo.trim().split(SEP);
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    return { ok: false };
  }
  return { ok: true, qrToken: parts[0], senseiId: parts[1], dataAula: parts[2] };
}
