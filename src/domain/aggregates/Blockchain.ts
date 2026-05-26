import { Block } from "../entities/Block";
import { Hash } from "../value-objects/Hash";

export class Blockchain {
  private constructor(private blocks: Block[]) {}

  static fromBlocks(blocks: Block[]): Blockchain {
    if (blocks.length === 0) {
      throw new Error("La cadena no puede estar vacía");
    }
    return new Blockchain([...blocks]);
  }

  static empty(): Blockchain {
    return new Blockchain([]);
  }

  getBlocks(): readonly Block[] {
    return this.blocks;
  }

  lastBlock(): Block | undefined {
    return this.blocks.at(-1);
  }

  append(block: Block): Blockchain {
    const last = this.lastBlock();
    if (last && block.index !== last.index + 1) {
      throw new Error("Índice de bloque incorrecto");
    }
    if (last && block.previousHash.toString() !== last.hash.toString()) {
      throw new Error("previousHash no coincide con el último bloque");
    }
    return new Blockchain([...this.blocks, block]);
  }

  replaceBlock(index: number, block: Block): Blockchain {
    if (index < 0 || index >= this.blocks.length) {
      throw new Error("Índice fuera de rango");
    }
    const next = [...this.blocks];
    next[index] = block;
    return new Blockchain(next);
  }

  isValid(verifyHash: (block: Block, previous: Block | null) => boolean): boolean {
    for (let i = 0; i < this.blocks.length; i++) {
      const current = this.blocks[i]!;
      const previous = i > 0 ? this.blocks[i - 1]! : null;

      if (i === 0) {
        if (current.previousHash.toString() !== Hash.genesis().toString()) {
          return false;
        }
      } else if (current.previousHash.toString() !== previous!.hash.toString()) {
        return false;
      }

      if (!verifyHash(current, previous)) {
        return false;
      }
    }
    return true;
  }
}
