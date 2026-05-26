import type { IBlockchainRepository } from "../../domain/ports/IBlockchainRepository";

/** Caso de uso didáctico: altera datos sin recalcular hash (rompe la cadena). */
export class TamperBlockUseCase {
  constructor(private readonly repository: IBlockchainRepository) {}

  async execute(index: number, newData: string) {
    const chain = await this.repository.load();
    const blocks = chain.getBlocks();
    const block = blocks[index];
    if (!block) throw new Error("Bloque no encontrado");

    const tampered = block.withData(newData);
    const updated = chain.replaceBlock(index, tampered);
    await this.repository.save(updated);

    return {
      index,
      data: tampered.data,
      hash: tampered.hash.toString(),
      warning:
        "Datos cambiados pero el hash NO se recalculó. Ejecuta validar para ver el fallo.",
    };
  }
}
