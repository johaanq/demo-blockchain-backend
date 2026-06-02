import { Blockchain } from "../../domain/aggregates/Blockchain";
import type { IBlockchainRepository } from "../../domain/ports/IBlockchainRepository";
import { BlockFactory } from "../services/BlockFactory";
import { recordBlockEmission } from "../services/EmissionLedger";

export class InitializeChainUseCase {
  constructor(
    private readonly repository: IBlockchainRepository,
    private readonly blockFactory: BlockFactory,
  ) {}

  async execute() {
    const genesis = this.blockFactory.createGenesis();
    const chain = Blockchain.fromBlocks([genesis]);
    await this.repository.save(chain);
    await recordBlockEmission(this.repository, genesis);
    return chain.getBlocks().map((b) => b.toJSON());
  }
}
