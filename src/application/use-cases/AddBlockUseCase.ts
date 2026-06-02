import type { IBlockchainRepository } from "../../domain/ports/IBlockchainRepository";
import { BlockFactory } from "../services/BlockFactory";
import type { PowMineHooks } from "../services/PowMiner";
import { PowMiner } from "../services/PowMiner";

function extractVoteDni(data: string): string | null {
  const match = data.match(/DNI=(\*\*\*\d{4}|\d{8})/);
  return match?.[1] ?? null;
}

function isDuplicateVote(chain: { getBlocks: () => readonly { data: string }[] }, dniToken: string) {
  return chain.getBlocks().some((block) => {
    if (!block.data.startsWith("VOTO")) return false;
    const existing = extractVoteDni(block.data);
    return existing === dniToken;
  });
}

export class AddBlockUseCase {
  constructor(
    private readonly repository: IBlockchainRepository,
    private readonly blockFactory: BlockFactory,
    private readonly powMiner: PowMiner,
  ) {}

  async execute(data: string, hooks?: PowMineHooks) {
    const chain = await this.repository.load();
    const last = chain.lastBlock();
    if (!last) throw new Error("Cadena sin bloques");

    if (data.startsWith("VOTO")) {
      const dniToken = extractVoteDni(data);
      if (dniToken && isDuplicateVote(chain, dniToken)) {
        throw new Error(
          "Este DNI ya emitió sufragio en esta jornada. Consulte su comprobante registrado.",
        );
      }
    }

    const draft = this.blockFactory.createNext(last.index + 1, data, last.hash);
    const { block: sealed, attempts } = this.powMiner.seal(draft, hooks);

    const updated = chain.append(sealed);
    await this.repository.save(updated);

    return {
      block: sealed.toJSON(),
      attempts,
      difficulty: this.powMiner.difficulty,
    };
  }
}
