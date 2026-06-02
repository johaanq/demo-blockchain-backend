import type { IBlockchainRepository } from "../../domain/ports/IBlockchainRepository";
import { AddBlockUseCase } from "./AddBlockUseCase";
import { InitializeChainUseCase } from "./InitializeChainUseCase";
import { BlockFactory } from "../services/BlockFactory";

export const DEMO_SEED_VOTES = [
  "VOTO | mesa=034521 | DNI=***8912 | opcion=KEIKO | EG2026-2V | comprobante=ONPE-SEED0001",
  "VOTO | mesa=034521 | DNI=***5618 | opcion=SANCHEZ | EG2026-2V | comprobante=ONPE-SEED0002",
  "VOTO | mesa=001245 | DNI=***4567 | opcion=KEIKO | EG2026-2V | comprobante=ONPE-SEED0003",
  "VOTO | mesa=078902 | DNI=***1234 | opcion=SANCHEZ | EG2026-2V | comprobante=ONPE-SEED0004",
] as const;

export class SeedDemoUseCase {
  private readonly initializeChain: InitializeChainUseCase;

  constructor(
    repository: IBlockchainRepository,
    blockFactory: BlockFactory,
    private readonly addBlock: AddBlockUseCase,
  ) {
    this.initializeChain = new InitializeChainUseCase(repository, blockFactory);
  }

  async execute() {
    await this.initializeChain.execute();
    for (const data of DEMO_SEED_VOTES) {
      await this.addBlock.execute(data);
    }
    return {
      message: "Mesa demo: génesis + 4 sufragios registrados y sellados con PoW",
      blocksAdded: DEMO_SEED_VOTES.length,
    };
  }
}
