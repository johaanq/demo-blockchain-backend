import type { IBlockchainRepository } from "../../domain/ports/IBlockchainRepository";

/** Caso de uso didáctico: altera datos sin recalcular hash (rompe la cadena). */
export class TamperBlockUseCase {
  constructor(private readonly repository: IBlockchainRepository) {}

  async execute(index: number, newData: string) {
    const chain = await this.repository.load();
    const blocks = chain.getBlocks();
    const block = blocks[index];
    if (!block) throw new Error("Bloque no encontrado");

    const previousData = block.data;
    const tampered = block.withData(newData);
    const updated = chain.replaceBlock(index, tampered);
    await this.repository.save(updated);

    return {
      index,
      previousData,
      data: tampered.data,
      hash: tampered.hash.toString(),
      warning:
        "El contenido del registro fue modificado en la cadena, pero el hash SHA-256 almacenado no se recalculó. " +
        "Pulse «Validar integridad» para comprobar que el sistema detecta la alteración.",
      explanation:
        "Esta operación imita un ataque real: cambiar el voto en el registro sin volver a minar. " +
        "El hash antiguo sigue guardado aunque el texto del sufragio ya es distinto.",
    };
  }
}
