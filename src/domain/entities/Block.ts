import type { Hash } from "../value-objects/Hash";

export interface BlockProps {
  index: number;
  timestamp: number;
  data: string;
  previousHash: Hash;
  nonce: number;
  hash: Hash;
}

export class Block {
  private constructor(private readonly props: BlockProps) {}

  static create(props: BlockProps): Block {
    if (!props.data.trim()) {
      throw new Error("El bloque debe contener datos");
    }
    return new Block(props);
  }

  get index(): number {
    return this.props.index;
  }

  get timestamp(): number {
    return this.props.timestamp;
  }

  get data(): string {
    return this.props.data;
  }

  get previousHash(): Hash {
    return this.props.previousHash;
  }

  get nonce(): number {
    return this.props.nonce;
  }

  get hash(): Hash {
    return this.props.hash;
  }

  withData(data: string): Block {
    return Block.create({ ...this.props, data });
  }

  withMining(nonce: number, hash: Hash): Block {
    return Block.create({ ...this.props, nonce, hash });
  }

  toJSON() {
    return {
      index: this.index,
      timestamp: this.timestamp,
      data: this.data,
      previousHash: this.previousHash.toString(),
      nonce: this.nonce,
      hash: this.hash.toString(),
    };
  }
}
