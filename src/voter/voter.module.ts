import { Module } from "@nestjs/common";
import { DniLookupService } from "./dni-lookup.service";
import { VoterController } from "./voter.controller";
import { VoterService } from "./voter.service";

@Module({
  controllers: [VoterController],
  providers: [VoterService, DniLookupService],
})
export class VoterModule {}
