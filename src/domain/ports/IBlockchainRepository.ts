import type { Blockchain } from "../aggregates/Blockchain";

export interface IBlockchainRepository {
  load(): Promise<Blockchain>;
  save(chain: Blockchain): Promise<void>;
  reset(): Promise<void>;
}
