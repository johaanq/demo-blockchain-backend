import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BlockFactory } from "../application/services/BlockFactory";
import { AddBlockUseCase } from "../application/use-cases/AddBlockUseCase";
import { GetChainUseCase } from "../application/use-cases/GetChainUseCase";
import { InitializeChainUseCase } from "../application/use-cases/InitializeChainUseCase";
import type { MineStreamEvent } from "../application/types/mining-stream";
import { MineBlockUseCase } from "../application/use-cases/MineBlockUseCase";
import { TamperBlockUseCase } from "../application/use-cases/TamperBlockUseCase";
import { ValidateChainUseCase } from "../application/use-cases/ValidateChainUseCase";
import type { IBlockchainRepository } from "../domain/ports/IBlockchainRepository";
import type { IHashService } from "../domain/ports/IHashService";
import { InMemoryBlockchainRepository } from "../infrastructure/persistence/InMemoryBlockchainRepository";
import { BLOCKCHAIN_REPOSITORY, DIFFICULTY, HASH_SERVICE } from "./tokens";

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 6;

@Injectable()
export class BlockchainService {
  private readonly initializeChainUseCase: InitializeChainUseCase;
  private readonly getChainUseCase: GetChainUseCase;
  private readonly addBlockUseCase: AddBlockUseCase;
  private readonly tamperBlockUseCase: TamperBlockUseCase;
  private readonly blockFactory: BlockFactory;
  private readonly hashService: IHashService;
  private mineBlockUseCase!: MineBlockUseCase;
  private validateChainUseCase!: ValidateChainUseCase;
  private difficulty: number;

  constructor(
    @Inject(BLOCKCHAIN_REPOSITORY)
    private readonly repository: IBlockchainRepository & InMemoryBlockchainRepository,
    @Inject(HASH_SERVICE) hashService: IHashService,
    @Inject(DIFFICULTY) initialDifficulty: number,
  ) {
    this.hashService = hashService;
    this.blockFactory = new BlockFactory(hashService);
    this.difficulty = this.clampDifficulty(initialDifficulty);
    this.initializeChainUseCase = new InitializeChainUseCase(repository, this.blockFactory);
    this.getChainUseCase = new GetChainUseCase(repository);
    this.addBlockUseCase = new AddBlockUseCase(repository, this.blockFactory);
    this.tamperBlockUseCase = new TamperBlockUseCase(repository);
    this.rebuildPowUseCases();
  }

  health() {
    return {
      status: "ok",
      difficulty: this.difficulty,
      difficultyRange: { min: MIN_DIFFICULTY, max: MAX_DIFFICULTY },
      initialized: this.repository.isInitialized(),
    };
  }

  setDifficulty(value: number) {
    const next = this.clampDifficulty(value);
    this.difficulty = next;
    this.rebuildPowUseCases();
    return {
      difficulty: this.difficulty,
      message: `Dificultad PoW actualizada: ${this.difficulty} cero(s) inicial(es) en el hash`,
    };
  }

  async initChain() {
    await this.repository.reset();
    const blocks = await this.initializeChainUseCase.execute();
    return { message: "Cadena inicializada", blocks };
  }

  async getChain() {
    return this.run(() => this.getChainUseCase.execute());
  }

  async addBlock(data: string) {
    return this.run(() => this.addBlockUseCase.execute(data.trim()));
  }

  async mineBlock(data: string) {
    return this.run(() => this.mineBlockUseCase.execute(data.trim()));
  }

  async mineBlockStream(data: string, emit: (event: MineStreamEvent) => void) {
    const trimmed = data.trim();
    try {
      const result = await this.mineBlockUseCase.execute(trimmed, {
        onStart: (difficulty) => {
          emit({
            type: "start",
            difficulty,
            targetPrefix: "0".repeat(difficulty),
          });
        },
        onProgress: (tick) => {
          emit({ type: "tick", ...tick });
        },
      });
      emit({
        type: "done",
        attempts: result.attempts,
        difficulty: result.difficulty,
        block: result.block,
      });
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error al minar";
      if (message === "CHAIN_NOT_INITIALIZED") {
        throw new NotFoundException(
          "Cadena no inicializada. Usa POST /api/chain/init",
        );
      }
      emit({ type: "error", message });
      throw new BadRequestException(message);
    }
  }

  async validate() {
    return this.run(() => this.validateChainUseCase.execute());
  }

  async tamper(index: number, data: string) {
    return this.run(() => this.tamperBlockUseCase.execute(index, data.trim()));
  }

  private rebuildPowUseCases() {
    this.mineBlockUseCase = new MineBlockUseCase(
      this.repository,
      this.blockFactory,
      this.hashService,
      this.difficulty,
    );
    this.validateChainUseCase = new ValidateChainUseCase(
      this.repository,
      this.blockFactory,
      this.hashService,
      this.difficulty,
    );
  }

  private clampDifficulty(value: number): number {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n) || n < MIN_DIFFICULTY || n > MAX_DIFFICULTY) {
      throw new BadRequestException(
        `La dificultad debe estar entre ${MIN_DIFFICULTY} y ${MAX_DIFFICULTY}`,
      );
    }
    return n;
  }

  private async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof Error) {
        if (e.message === "CHAIN_NOT_INITIALIZED") {
          throw new NotFoundException(
            "Cadena no inicializada. Usa POST /api/chain/init",
          );
        }
        throw new BadRequestException(e.message);
      }
      throw e;
    }
  }
}
