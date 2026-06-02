import type { Block } from "../../domain/entities/Block";
import type { IHashService } from "../../domain/ports/IHashService";
import type { MiningTick } from "../types/mining-stream";
import { BlockFactory } from "./BlockFactory";

export interface PowMineHooks {
  onStart?: (difficulty: number) => void;
  onProgress?: (tick: MiningTick) => void;
}

export class PowMiner {
  constructor(
    private readonly blockFactory: BlockFactory,
    private readonly hashService: IHashService,
    readonly difficulty: number,
  ) {}

  seal(block: Block, hooks?: PowMineHooks): { block: Block; attempts: number } {
    hooks?.onStart?.(this.difficulty);

    let nonce = block.nonce;
    let current = block;

    if (
      nonce > 0 &&
      this.hashService.meetsDifficulty(current.hash.toString(), this.difficulty)
    ) {
      return { block: current, attempts: nonce + 1 };
    }

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
          hash: current.hash.toString(),
        });
      }
    };

    emitProgress();

    const maxAttempts = 2_000_000;
    while (
      !this.hashService.meetsDifficulty(current.hash.toString(), this.difficulty) &&
      nonce < maxAttempts
    ) {
      nonce++;
      current = this.blockFactory.rehash(current, nonce);
      emitProgress();
    }

    if (!this.hashService.meetsDifficulty(current.hash.toString(), this.difficulty)) {
      throw new Error("No se encontró nonce en el límite de intentos");
    }

    hooks?.onProgress?.({
      attempt: nonce + 1,
      nonce,
      hash: current.hash.toString(),
    });

    return { block: current, attempts: nonce + 1 };
  }
}
