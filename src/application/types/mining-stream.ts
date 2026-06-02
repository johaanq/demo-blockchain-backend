export interface MiningTick {
  attempt: number;
  nonce: number;
  hash: string;
}

export type MineStreamEvent =
  | { type: "start"; difficulty: number; targetPrefix: string }
  | ({ type: "tick" } & MiningTick)
  | {
      type: "done";
      attempts: number;
      difficulty: number;
      block: {
        index: number;
        timestamp: number;
        data: string;
        previousHash: string;
        nonce: number;
        hash: string;
      };
      sealedCount?: number;
    }
  | { type: "error"; message: string };
