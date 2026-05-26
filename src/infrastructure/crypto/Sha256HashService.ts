import { createHash } from "node:crypto";
import type { BlockHashInput, IHashService } from "../../domain/ports/IHashService";

export class Sha256HashService implements IHashService {
  compute(input: BlockHashInput): string {
    const payload = JSON.stringify(input);
    return createHash("sha256").update(payload).digest("hex");
  }

  meetsDifficulty(hash: string, difficulty: number): boolean {
    return hash.startsWith("0".repeat(difficulty));
  }
}
