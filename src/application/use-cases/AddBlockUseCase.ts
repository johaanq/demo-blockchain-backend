import type { IBlockchainRepository } from "../../domain/ports/IBlockchainRepository";
import { BlockFactory } from "../services/BlockFactory";

export class AddBlockUseCase {
  constructor(
    private readonly repository: IBlockchainRepository,
    private readonly blockFactory: BlockFactory,
  ) {}

  async execute(data: string) {
    const chain = await this.repository.load();
    const last = chain.lastBlock();
    if (!last) throw new Error("Cadena sin bloques");

    const block = this.blockFactory.createNext(
      last.index + 1,
      data,
      last.hash,
    );
    const updated = chain.append(block);
    await this.repository.save(updated);
    return block.toJSON();
  }
}
