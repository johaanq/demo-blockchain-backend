import { Block } from "../../domain/entities/Block";
import { Hash } from "../../domain/value-objects/Hash";
import type { BlockHashInput, IHashService } from "../../domain/ports/IHashService";

export class BlockFactory {
  constructor(private readonly hashService: IHashService) {}

  createGenesis(): Block {
    const timestamp = Date.now();
    const input: BlockHashInput = {
      index: 0,
      timestamp,
      data: "GENESIS · ledger-demo v1",
      previousHash: Hash.genesis().toString(),
      nonce: 0,
    };
    const hash = Hash.create(this.hashService.compute(input));
    return Block.create({
      index: 0,
      timestamp,
      data: input.data,
      previousHash: Hash.genesis(),
      nonce: 0,
      hash,
    });
  }

  createNext(index: number, data: string, previousHash: Hash, nonce = 0): Block {
    const timestamp = Date.now();
    const input: BlockHashInput = {
      index,
      timestamp,
      data,
      previousHash: previousHash.toString(),
      nonce,
    };
    const hash = Hash.create(this.hashService.compute(input));
    return Block.create({
      index,
      timestamp,
      data,
      previousHash,
      nonce,
      hash,
    });
  }

  rehash(block: Block, nonce: number): Block {
    const input: BlockHashInput = {
      index: block.index,
      timestamp: block.timestamp,
      data: block.data,
      previousHash: block.previousHash.toString(),
      nonce,
    };
    const hash = Hash.create(this.hashService.compute(input));
    return block.withMining(nonce, hash);
  }

  verify(block: Block): boolean {
    const input: BlockHashInput = {
      index: block.index,
      timestamp: block.timestamp,
      data: block.data,
      previousHash: block.previousHash.toString(),
      nonce: block.nonce,
    };
    return block.hash.toString() === this.hashService.compute(input);
  }
}
