import type { Blockchain } from "../aggregates/Blockchain";
import type { EmissionRecord } from "../entities/EmissionRecord";

export interface IBlockchainRepository {
  load(): Promise<Blockchain>;
  save(chain: Blockchain): Promise<void>;
  reset(): Promise<void>;
  appendEmissionRecord(record: EmissionRecord): Promise<void>;
  getEmissionRecords(): Promise<readonly EmissionRecord[]>;
}
