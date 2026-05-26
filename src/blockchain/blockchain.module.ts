import { Module } from "@nestjs/common";
import { Sha256HashService } from "../infrastructure/crypto/Sha256HashService";
import { InMemoryBlockchainRepository } from "../infrastructure/persistence/InMemoryBlockchainRepository";
import { BlockchainController } from "./blockchain.controller";
import { BlockchainService } from "./blockchain.service";
import { BLOCKCHAIN_REPOSITORY, DIFFICULTY, HASH_SERVICE } from "./tokens";

@Module({
  controllers: [BlockchainController],
  providers: [
    BlockchainService,
    {
      provide: BLOCKCHAIN_REPOSITORY,
      useClass: InMemoryBlockchainRepository,
    },
    {
      provide: HASH_SERVICE,
      useClass: Sha256HashService,
    },
    {
      provide: DIFFICULTY,
      useValue: Number(process.env.DIFFICULTY ?? 4),
    },
  ],
})
export class BlockchainModule {}
