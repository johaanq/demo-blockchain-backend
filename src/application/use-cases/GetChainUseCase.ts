import type { IBlockchainRepository } from "../../domain/ports/IBlockchainRepository";

export class GetChainUseCase {
  constructor(private readonly repository: IBlockchainRepository) {}

  async execute() {
    const chain = await this.repository.load();
    return {
      length: chain.getBlocks().length,
      blocks: chain.getBlocks().map((b) => b.toJSON()),
    };
  }
}
