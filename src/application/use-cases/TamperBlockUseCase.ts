import { Blockchain } from "../../domain/aggregates/Blockchain";
import { Hash } from "../../domain/value-objects/Hash";
import type { IBlockchainRepository } from "../../domain/ports/IBlockchainRepository";
import { BlockFactory } from "../services/BlockFactory";
import { recordBlockEmission } from "../services/EmissionLedger";
import type { PowMiner } from "../services/PowMiner";

/**
 * Alteración fraudulenta real: cambia el sufragio, re-mina el bloque y re-sella
 * toda la cola de la cadena para que los hashes y enlaces sigan cuadrando.
 * La acta de emisión (inmutable) permite detectar el fraude al auditar.
 */
export class TamperBlockUseCase {
  constructor(
    private readonly repository: IBlockchainRepository,
    private readonly blockFactory: BlockFactory,
    private readonly powMiner: PowMiner,
  ) {}

  async execute(index: number, newData: string) {
    const chain = await this.repository.load();
    const blocks = [...chain.getBlocks()];
    const target = blocks[index];
    if (!target) throw new Error("Bloque no encontrado");
    if (index === 0) throw new Error("No se puede alterar el bloque génesis");

    const previousData = target.data;
    const previousHash = target.hash.toString();

    const previousBlockHash = index > 0 ? blocks[index - 1]!.hash : Hash.genesis();
    let draft = this.blockFactory.createDraft(
      target.index,
      target.timestamp,
      newData,
      previousBlockHash,
    );
    let { block: sealed, attempts: tamperAttempts } = this.powMiner.seal(draft);
    blocks[index] = sealed;

    let rechainedCount = 0;
    let tailAttempts = 0;
    for (let j = index + 1; j < blocks.length; j++) {
      const current = blocks[j]!;
      draft = this.blockFactory.createDraft(
        current.index,
        current.timestamp,
        current.data,
        blocks[j - 1]!.hash,
      );
      const remined = this.powMiner.seal(draft);
      blocks[j] = remined.block;
      tailAttempts += remined.attempts;
      rechainedCount++;
    }

    const updated = Blockchain.fromBlocks(blocks);
    await this.repository.save(updated);

    const tampered = blocks[index]!;

    return {
      index,
      previousData,
      data: tampered.data,
      previousHash,
      hash: tampered.hash.toString(),
      nonce: tampered.nonce,
      tamperAttempts,
      rechainedCount,
      tailAttempts,
      warning:
        "Sufragio alterado y cadena re-sellada con PoW. Los hashes encadenados pueden seguir siendo válidos; " +
        "la alteración se detecta comparando con la acta de emisión inmutable.",
      explanation:
        "Fraude real: se cambió el contenido, se recalculó el hash y se re-minó el bloque afectado" +
        (rechainedCount > 0
          ? `, además de re-sellar ${rechainedCount} registro(s) posterior(es) para mantener la cadena coherente.`
          : ".") +
        " Pulse «Validar integridad»: el sistema contrastará la cadena actual con la acta guardada al momento de cada emisión.",
    };
  }
}
