export interface BlockHashInput {
  index: number;
  timestamp: number;
  data: string;
  previousHash: string;
  nonce: number;
}

export interface IHashService {
  compute(input: BlockHashInput): string;
  meetsDifficulty(hash: string, difficulty: number): boolean;
}
