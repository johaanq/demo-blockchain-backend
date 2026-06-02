import type { Blockchain } from "../../domain/aggregates/Blockchain";
import type { EmissionRecord } from "../../domain/entities/EmissionRecord";
import type { IBlockchainRepository } from "../../domain/ports/IBlockchainRepository";

export class InMemoryBlockchainRepository implements IBlockchainRepository {
  private chain: Blockchain | null = null;
  private emissionRecords: EmissionRecord[] = [];

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
    this.emissionRecords = [];
  }

  async appendEmissionRecord(record: EmissionRecord): Promise<void> {
    if (this.emissionRecords.some((r) => r.blockIndex === record.blockIndex)) {
      throw new Error(`Ya existe acta de emisión para el registro #${record.blockIndex}`);
    }
    this.emissionRecords = [...this.emissionRecords, record];
  }

  async getEmissionRecords(): Promise<readonly EmissionRecord[]> {
    return this.emissionRecords;
  }

  isInitialized(): boolean {
    return this.chain !== null;
  }
}
