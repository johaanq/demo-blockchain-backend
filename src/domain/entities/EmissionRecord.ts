/** Acta de emisión inmutable — copia oficial al registrar cada bloque (no se altera con fraude). */
export type EmissionRecord = {
  blockIndex: number;
  data: string;
  hash: string;
  timestamp: number;
  recordedAt: number;
};
