import { Body, Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { VerifyVoterDto } from "./dto/verify-voter.dto";
import { VoterService } from "./voter.service";

@Controller("voter")
export class VoterController {
  constructor(private readonly voter: VoterService) {}

  @Get("config")
  config() {
    return this.voter.config();
  }

  @Post("verify")
  @HttpCode(HttpStatus.OK)
  verify(@Body() dto: VerifyVoterDto) {
    return this.voter.verify(dto);
  }
}
