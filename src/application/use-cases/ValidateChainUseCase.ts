import type { IBlockchainRepository } from "../../domain/ports/IBlockchainRepository";
import { BlockFactory } from "../services/BlockFactory";
import type { IHashService } from "../../domain/ports/IHashService";

export class ValidateChainUseCase {
  constructor(
    private readonly repository: IBlockchainRepository,
    private readonly blockFactory: BlockFactory,
    private readonly hashService: IHashService,
    private readonly difficulty: number,
  ) {}

  async execute() {
    const chain = await this.repository.load();
    const blocks = chain.getBlocks();
    const issues: string[] = [];

    const valid = chain.isValid((block, previous) => {
      if (!this.blockFactory.verify(block)) {
        issues.push(`Bloque ${block.index}: hash no coincide con los datos`);
        return false;
      }
      if (previous && block.previousHash.toString() !== previous.hash.toString()) {
        issues.push(`Bloque ${block.index}: enlace roto con el anterior`);
        return false;
      }
      // PoW opcional: solo advertimos si un bloque minado ya no cumple dificultad
      if (
        block.index > 0 &&
        block.nonce > 0 &&
        !this.hashService.meetsDifficulty(block.hash.toString(), this.difficulty)
      ) {
        issues.push(`Bloque ${block.index}: hash minado no cumple dificultad`);
        return false;
      }
      return true;
    });

    return {
      valid,
      length: blocks.length,
      issues,
      message: valid
        ? "La cadena es íntegra. Ningún bloque fue alterado."
        : "Cadena inválida. Algún bloque fue manipulado o el hash es incorrecto.",
    };
  }
}
