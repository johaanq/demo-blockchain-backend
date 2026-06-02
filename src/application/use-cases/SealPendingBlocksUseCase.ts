import type { IBlockchainRepository } from "../../domain/ports/IBlockchainRepository";
import type { IHashService } from "../../domain/ports/IHashService";
import type { PowMineHooks } from "../services/PowMiner";
import { PowMiner } from "../services/PowMiner";

export class SealPendingBlocksUseCase {
  constructor(
    private readonly repository: IBlockchainRepository,
    private readonly powMiner: PowMiner,
    private readonly hashService: IHashService,
  ) {}

  async execute(hooks?: PowMineHooks) {
    const chain = await this.repository.load();
    let current = chain;
    let sealedCount = 0;
    let totalAttempts = 0;
    let lastBlock: ReturnType<typeof chain.getBlocks>[number] | null = null;

    for (const block of chain.getBlocks()) {
      if (block.index === 0) continue;

      const alreadySealed =
        block.nonce > 0 &&
        this.hashService.meetsDifficulty(block.hash.toString(), this.powMiner.difficulty);

      if (alreadySealed) continue;

      const { block: sealed, attempts } = this.powMiner.seal(block, hooks);
      current = current.replaceBlock(block.index, sealed);
      sealedCount++;
      totalAttempts += attempts;
      lastBlock = sealed;
    }

    if (sealedCount === 0) {
      throw new Error("No hay sufragios pendientes de sellado");
    }

    await this.repository.save(current);

    return {
      sealedCount,
      attempts: totalAttempts,
      difficulty: this.powMiner.difficulty,
      block: lastBlock?.toJSON() ?? null,
    };
  }
}
