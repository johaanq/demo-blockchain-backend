import type { IBlockchainRepository } from "../../domain/ports/IBlockchainRepository";
import type { EmissionRecord } from "../../domain/entities/EmissionRecord";
import type { Block } from "../../domain/entities/Block";

export async function recordBlockEmission(
  repository: IBlockchainRepository,
  block: Block,
): Promise<void> {
  const record: EmissionRecord = {
    blockIndex: block.index,
    data: block.data,
    hash: block.hash.toString(),
    timestamp: block.timestamp,
    recordedAt: Date.now(),
  };
  await repository.appendEmissionRecord(record);
}
