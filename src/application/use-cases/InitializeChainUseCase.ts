import { Blockchain } from "../../domain/aggregates/Blockchain";
import type { IBlockchainRepository } from "../../domain/ports/IBlockchainRepository";
import { BlockFactory } from "../services/BlockFactory";

export class InitializeChainUseCase {
  constructor(
    private readonly repository: IBlockchainRepository,
    private readonly blockFactory: BlockFactory,
  ) {}

  async execute() {
    const genesis = this.blockFactory.createGenesis();
    const chain = Blockchain.fromBlocks([genesis]);
    await this.repository.save(chain);
    return chain.getBlocks().map((b) => b.toJSON());
  }
}
