import type { IBlockchainRepository } from "../../domain/ports/IBlockchainRepository";
import { BlockFactory } from "../services/BlockFactory";
import type { Block } from "../../domain/entities/Block";
import type { IHashService } from "../../domain/ports/IHashService";

export type ValidationIssueDetail = {
  blockIndex: number;
  kind:
    | "hash_mismatch"
    | "broken_link"
    | "pow_pending"
    | "pow_invalid"
    | "emission_mismatch";
  title: string;
  detail: string;
  storedHash?: string;
  expectedHash?: string;
  dataSnippet?: string;
  officialDataSnippet?: string;
  officialHash?: string;
};

export class ValidateChainUseCase {
  constructor(
    private readonly repository: IBlockchainRepository,
    private readonly blockFactory: BlockFactory,
    private readonly hashService: IHashService,
    private readonly difficulty: number,
  ) {}

  private snippet(data: string, max = 100): string {
    const t = data.trim();
    return t.length <= max ? t : `${t.slice(0, max)}…`;
  }

  private hashMismatchIssue(block: Block): ValidationIssueDetail {
    const input = {
      index: block.index,
      timestamp: block.timestamp,
      data: block.data,
      previousHash: block.previousHash.toString(),
      nonce: block.nonce,
    };
    const expectedHash = this.hashService.compute(input);
    const storedHash = block.hash.toString();

    return {
      blockIndex: block.index,
      kind: "hash_mismatch",
      title: `Registro #${block.index}: huella digital inconsistente`,
      detail:
        "El hash almacenado no coincide con el recalculado a partir del contenido actual. " +
        "Indica manipulación sin re-sellar correctamente el bloque.",
      storedHash,
      expectedHash,
      dataSnippet: this.snippet(block.data),
    };
  }

  async execute() {
    const chain = await this.repository.load();
    const blocks = chain.getBlocks();
    const emissionRecords = await this.repository.getEmissionRecords();
    const issues: string[] = [];
    const issueDetails: ValidationIssueDetail[] = [];

    chain.isValid((block, previous) => {
      if (!this.blockFactory.verify(block)) {
        issueDetails.push(this.hashMismatchIssue(block));
        issues.push(`Registro #${block.index}: huella digital inconsistente`);
        return false;
      }
      if (previous && block.previousHash.toString() !== previous.hash.toString()) {
        issueDetails.push({
          blockIndex: block.index,
          kind: "broken_link",
          title: `Registro #${block.index}: enlace roto con el registro anterior`,
          detail:
            `El hash del registro #${block.index - 1} ya no coincide con el «hash anterior» de este bloque.`,
          storedHash: block.previousHash.toString(),
          expectedHash: previous.hash.toString(),
        });
        issues.push(`Registro #${block.index}: enlace roto con el registro #${block.index - 1}`);
        return false;
      }
      if (block.index > 0 && block.nonce === 0) {
        issueDetails.push({
          blockIndex: block.index,
          kind: "pow_pending",
          title: `Registro #${block.index}: sufragio sin sellar (PoW)`,
          detail: "Este bloque no completó la prueba de trabajo al registrarse.",
          dataSnippet: this.snippet(block.data),
        });
        issues.push(`Registro #${block.index}: sufragio sin sellar (PoW pendiente)`);
        return false;
      }
      if (
        block.index > 0 &&
        block.nonce > 0 &&
        !this.hashService.meetsDifficulty(block.hash.toString(), this.difficulty)
      ) {
        issueDetails.push({
          blockIndex: block.index,
          kind: "pow_invalid",
          title: `Registro #${block.index}: sellado PoW insuficiente`,
          detail: `El hash no cumple la dificultad actual (${this.difficulty} ceros iniciales).`,
          storedHash: block.hash.toString(),
          dataSnippet: this.snippet(block.data),
        });
        issues.push(`Registro #${block.index}: hash minado no cumple dificultad PoW`);
        return false;
      }
      return true;
    });

    for (const record of emissionRecords) {
      const block = blocks[record.blockIndex];
      if (!block) continue;

      if (block.data !== record.data) {
        issueDetails.push({
          blockIndex: record.blockIndex,
          kind: "emission_mismatch",
          title: `Registro #${record.blockIndex}: sufragio distinto al acta de emisión`,
          detail:
            "El contenido del sufragio ya no coincide con la acta de emisión guardada al momento del voto. " +
            "Aunque un atacante re-calcule hashes y re-mina la cadena, esta comparación revela qué voto fue cambiado.",
          officialDataSnippet: this.snippet(record.data),
          dataSnippet: this.snippet(block.data),
          officialHash: record.hash,
          storedHash: block.hash.toString(),
        });
        issues.push(
          `Registro #${record.blockIndex}: el sufragio difiere del acta de emisión oficial`,
        );
      }
    }

    const allValid = issues.length === 0;
    const emissionIssues = issueDetails.filter((d) => d.kind === "emission_mismatch");

    const howItWorks =
      "Al emitir cada sufragio se guarda una copia inmutable en el acta de emisión (contenido + hash oficial). " +
      "Un atacante puede alterar el voto, recalcular hashes y re-minar la cadena; al validar, el sistema contrasta " +
      "la cadena actual con esa acta y reporta qué registro dejó de coincidir.";

    return {
      valid: allValid,
      length: blocks.length,
      issues,
      issueDetails,
      message: allValid
        ? "El registro electoral es íntegro. Ningún voto difiere del acta de emisión."
        : emissionIssues.length > 0
          ? emissionIssues.length === 1
            ? `Fraude detectado: el registro #${emissionIssues[0].blockIndex} ya no coincide con el acta de emisión.`
            : `Fraude detectado en ${emissionIssues.length} registro(s) respecto al acta de emisión.`
          : issueDetails.length === 1
            ? `Alteración detectada en el registro #${issueDetails[0].blockIndex}.`
            : `Alteración detectada en ${issueDetails.length} registro(s) de la cadena.`,
      howItWorks,
    };
  }
}
