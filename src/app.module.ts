import { Module } from "@nestjs/common";
import { BlockchainModule } from "./blockchain/blockchain.module";
import { VoterModule } from "./voter/voter.module";

@Module({
  imports: [BlockchainModule, VoterModule],
})
export class AppModule {}
