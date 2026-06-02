import type { IBlockchainRepository } from "../../domain/ports/IBlockchainRepository";
import { BlockFactory } from "../services/BlockFactory";
import type { Block } from "../../domain/entities/Block";
import type { IHashService } from "../../domain/ports/IHashService";

export type EmissionComparison = {
  blockIndex: number;
  officialData: string;
  chainData: string;
  officialHash: string;
  chainHash: string;
  dataMatches: boolean;
  hashMatches: boolean;
  matches: boolean;
};

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
  officialData?: string;
  chainData?: string;
  officialDataSnippet?: string;
  officialHash?: string;
  chainHash?: string;
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
    let chainIntegrityValid = true;

    chain.isValid((block, previous) => {
      if (!this.blockFactory.verify(block)) {
        chainIntegrityValid = false;
        issueDetails.push(this.hashMismatchIssue(block));
        issues.push(`Registro #${block.index}: huella digital inconsistente`);
        return false;
      }
      if (previous && block.previousHash.toString() !== previous.hash.toString()) {
        chainIntegrityValid = false;
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
        chainIntegrityValid = false;
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
        chainIntegrityValid = false;
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

    const emissionComparisons: EmissionComparison[] = [];

    for (const record of emissionRecords) {
      const block = blocks[record.blockIndex];
      if (!block) continue;

      const dataMatches = block.data === record.data;
      const hashMatches = block.hash.toString() === record.hash;
      const comparison: EmissionComparison = {
        blockIndex: record.blockIndex,
        officialData: record.data,
        chainData: block.data,
        officialHash: record.hash,
        chainHash: block.hash.toString(),
        dataMatches,
        hashMatches,
        matches: dataMatches,
      };
      emissionComparisons.push(comparison);

      if (!dataMatches) {
        issueDetails.push({
          blockIndex: record.blockIndex,
          kind: "emission_mismatch",
          title: `Registro #${record.blockIndex}: sufragio distinto al acta de emisión`,
          detail:
            "Comparación real: el sufragio en la cadena blockchain ya no es igual al guardado " +
            "en el acta de emisión inmutable al momento del voto.",
          officialData: record.data,
          chainData: block.data,
          officialHash: record.hash,
          chainHash: block.hash.toString(),
        });
        issues.push(
          `Registro #${record.blockIndex}: el sufragio difiere del acta de emisión oficial`,
        );
      }
    }

    const emissionAuditValid = emissionComparisons.every((c) => c.matches);
    const structuralIssues = issueDetails.filter((d) => d.kind !== "emission_mismatch");
    const emissionIssues = issueDetails.filter((d) => d.kind === "emission_mismatch");
    const allValid = chainIntegrityValid && emissionAuditValid;

    const howItWorks =
      "Paso 1 — Integridad blockchain: se verifican enlaces entre bloques, hashes recalculados y PoW. " +
      "Un atacante puede re-minar y pasar esta prueba. " +
      "Paso 2 — Acta de emisión: se compara byte a byte cada sufragio de la cadena con la copia inmutable " +
      "guardada al emitir el voto; si difieren, el fraude queda expuesto aunque la cadena parezca válida.";

    return {
      valid: allValid,
      chainIntegrityValid,
      emissionAuditValid,
      emissionComparisons,
      length: blocks.length,
      issues,
      issueDetails,
      message: allValid
        ? "El registro electoral es íntegro. La cadena blockchain y el acta de emisión coinciden en todos los registros."
        : !chainIntegrityValid && !emissionAuditValid
          ? "La cadena presenta fallos estructurales y también difiere del acta de emisión."
          : chainIntegrityValid && !emissionAuditValid
            ? emissionIssues.length === 1
              ? `La cadena blockchain es estructuralmente válida, pero el registro #${emissionIssues[0].blockIndex} no coincide con el acta de emisión.`
              : `La cadena blockchain es estructuralmente válida, pero ${emissionIssues.length} registro(s) no coinciden con el acta de emisión.`
            : structuralIssues.length === 1
              ? `Alteración estructural detectada en el registro #${structuralIssues[0].blockIndex}.`
              : `Alteración estructural detectada en ${structuralIssues.length} registro(s).`,
      howItWorks,
    };
  }
}
