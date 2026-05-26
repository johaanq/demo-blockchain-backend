import type { MiningTick } from "../types/mining-stream";
import type { IBlockchainRepository } from "../../domain/ports/IBlockchainRepository";
import type { IHashService } from "../../domain/ports/IHashService";
import { BlockFactory } from "../services/BlockFactory";

export interface MineBlockHooks {
  onStart?: (difficulty: number) => void;
  onProgress?: (tick: MiningTick) => void;
}

export class MineBlockUseCase {
  constructor(
    private readonly repository: IBlockchainRepository,
    private readonly blockFactory: BlockFactory,
    private readonly hashService: IHashService,
    private readonly difficulty: number,
  ) {}

  async execute(data: string, hooks?: MineBlockHooks) {
    const chain = await this.repository.load();
    const last = chain.lastBlock();
    if (!last) throw new Error("Cadena sin bloques");

    hooks?.onStart?.(this.difficulty);

    let nonce = 0;
    let block = this.blockFactory.createNext(
      last.index + 1,
      data,
      last.hash,
      nonce,
    );

    let lastProgressAt = 0;
    const emitProgress = () => {
      if (!hooks?.onProgress) return;
      const now = Date.now();
      const attempt = nonce + 1;
      if (attempt <= 3 || now - lastProgressAt >= 140 || attempt % 800 === 0) {
        lastProgressAt = now;
        hooks.onProgress({
          attempt,
          nonce,
          hash: block.hash.toString(),
        });
      }
    };

    emitProgress();

    const maxAttempts = 2_000_000;
    while (
      !this.hashService.meetsDifficulty(block.hash.toString(), this.difficulty) &&
      nonce < maxAttempts
    ) {
      nonce++;
      block = this.blockFactory.rehash(block, nonce);
      emitProgress();
    }

    if (!this.hashService.meetsDifficulty(block.hash.toString(), this.difficulty)) {
      throw new Error("No se encontró nonce en el límite de intentos");
    }

    hooks?.onProgress?.({
      attempt: nonce + 1,
      nonce,
      hash: block.hash.toString(),
    });

    const updated = chain.append(block);
    await this.repository.save(updated);

    return {
      block: block.toJSON(),
      attempts: nonce + 1,
      difficulty: this.difficulty,
    };
  }
}
