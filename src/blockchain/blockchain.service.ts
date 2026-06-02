import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { BlockFactory } from "../application/services/BlockFactory";
import { PowMiner } from "../application/services/PowMiner";
import { AddBlockUseCase } from "../application/use-cases/AddBlockUseCase";
import { GetChainUseCase } from "../application/use-cases/GetChainUseCase";
import { InitializeChainUseCase } from "../application/use-cases/InitializeChainUseCase";
import type { MineStreamEvent } from "../application/types/mining-stream";
import { SealPendingBlocksUseCase } from "../application/use-cases/SealPendingBlocksUseCase";
import { TamperBlockUseCase } from "../application/use-cases/TamperBlockUseCase";
import { SeedDemoUseCase } from "../application/use-cases/SeedDemoUseCase";
import { ValidateChainUseCase } from "../application/use-cases/ValidateChainUseCase";
import type { IBlockchainRepository } from "../domain/ports/IBlockchainRepository";
import type { IHashService } from "../domain/ports/IHashService";
import { InMemoryBlockchainRepository } from "../infrastructure/persistence/InMemoryBlockchainRepository";
import { BLOCKCHAIN_REPOSITORY, DIFFICULTY, HASH_SERVICE } from "./tokens";

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 6;

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly initializeChainUseCase: InitializeChainUseCase;
  private readonly getChainUseCase: GetChainUseCase;
  private readonly tamperBlockUseCase: TamperBlockUseCase;
  private seedDemoUseCase!: SeedDemoUseCase;
  private readonly blockFactory: BlockFactory;
  private readonly hashService: IHashService;
  private addBlockUseCase!: AddBlockUseCase;
  private sealPendingBlocksUseCase!: SealPendingBlocksUseCase;
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
    this.tamperBlockUseCase = new TamperBlockUseCase(repository);
    this.rebuildPowUseCases();
  }

  async onModuleInit() {
    if (!this.repository.isInitialized()) {
      await this.initializeChainUseCase.execute();
    }
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

  async seedDemo() {
    await this.repository.reset();
    const seedResult = await this.seedDemoUseCase.execute();
    const blocks = await this.getChainUseCase.execute();
    return {
      ...seedResult,
      blocks: blocks.blocks,
    };
  }

  async getChain() {
    return this.run(() => this.getChainUseCase.execute());
  }

  async addBlock(data: string) {
    return this.run(() => this.addBlockUseCase.execute(data.trim()));
  }

  async addBlockStream(data: string, emit: (event: MineStreamEvent) => void) {
    const trimmed = data.trim();
    try {
      const result = await this.addBlockUseCase.execute(trimmed, {
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
      const message = e instanceof Error ? e.message : "Error al registrar sufragio";
      emit({ type: "error", message });
      throw new BadRequestException(message);
    }
  }

  async sealPendingBlocks() {
    return this.run(() => this.sealPendingBlocksUseCase.execute());
  }

  async sealPendingBlocksStream(emit: (event: MineStreamEvent) => void) {
    try {
      const result = await this.sealPendingBlocksUseCase.execute({
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
        block: result.block!,
        sealedCount: result.sealedCount,
      });
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error al sellar";
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
    const powMiner = new PowMiner(this.blockFactory, this.hashService, this.difficulty);
    this.addBlockUseCase = new AddBlockUseCase(this.repository, this.blockFactory, powMiner);
    this.sealPendingBlocksUseCase = new SealPendingBlocksUseCase(
      this.repository,
      powMiner,
      this.hashService,
    );
    this.validateChainUseCase = new ValidateChainUseCase(
      this.repository,
      this.blockFactory,
      this.hashService,
      this.difficulty,
    );
    this.seedDemoUseCase = new SeedDemoUseCase(
      this.repository,
      this.blockFactory,
      this.addBlockUseCase,
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
