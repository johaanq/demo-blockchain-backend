import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { BlockchainService } from "./blockchain.service";
import { BlockDataDto, TamperBlockDto } from "./dto/block-data.dto";
import { SetDifficultyDto } from "./dto/difficulty.dto";

@Controller()
export class BlockchainController {
  constructor(private readonly blockchain: BlockchainService) {}

  @Get("health")
  health() {
    return this.blockchain.health();
  }

  @Patch("config/difficulty")
  setDifficulty(@Body() dto: SetDifficultyDto) {
    return this.blockchain.setDifficulty(dto.difficulty);
  }

  @Post("chain/init")
  @HttpCode(HttpStatus.CREATED)
  initChain() {
    return this.blockchain.initChain();
  }

  @Post("chain/seed")
  @HttpCode(HttpStatus.CREATED)
  seedDemo() {
    return this.blockchain.seedDemo();
  }

  @Get("chain")
  getChain() {
    return this.blockchain.getChain();
  }

  @Post("chain/blocks")
  @HttpCode(HttpStatus.CREATED)
  addBlock(@Body() dto: BlockDataDto) {
    return this.blockchain.addBlock(dto.data);
  }

  @Post("chain/blocks/stream")
  async addBlockStream(@Body() dto: BlockDataDto, @Res() res: Response) {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (event: unknown) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      await this.blockchain.addBlockStream(dto.data, send);
      res.end();
    } catch {
      res.end();
    }
  }

  @Post("chain/seal-pending")
  @HttpCode(HttpStatus.OK)
  sealPending() {
    return this.blockchain.sealPendingBlocks();
  }

  @Post("chain/seal-pending/stream")
  async sealPendingStream(@Res() res: Response) {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (event: unknown) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      await this.blockchain.sealPendingBlocksStream(send);
      res.end();
    } catch {
      res.end();
    }
  }

  @Get("chain/validate")
  validate() {
    return this.blockchain.validate();
  }

  @Post("chain/tamper")
  tamper(@Body() dto: TamperBlockDto) {
    return this.blockchain.tamper(dto.index, dto.data);
  }
}
