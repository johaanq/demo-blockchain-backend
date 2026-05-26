import type { Blockchain } from "../../domain/aggregates/Blockchain";
import type { IBlockchainRepository } from "../../domain/ports/IBlockchainRepository";

export class InMemoryBlockchainRepository implements IBlockchainRepository {
  private chain: Blockchain | null = null;

  async load(): Promise<Blockchain> {
    if (!this.chain) {
      throw new Error("CHAIN_NOT_INITIALIZED");
    }
    return this.chain;
  }

  async save(chain: Blockchain): Promise<void> {
    this.chain = chain;
  }

  async reset(): Promise<void> {
    this.chain = null;
  }

  isInitialized(): boolean {
    return this.chain !== null;
  }
}
