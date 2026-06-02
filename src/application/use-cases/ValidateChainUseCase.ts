import type { IBlockchainRepository } from "../../domain/ports/IBlockchainRepository";
import { BlockFactory } from "../services/BlockFactory";
import type { Block } from "../../domain/entities/Block";
import type { IHashService } from "../../domain/ports/IHashService";

export type ValidationIssueDetail = {
  blockIndex: number;
  kind: "hash_mismatch" | "broken_link" | "pow_pending" | "pow_invalid";
  title: string;
  detail: string;
  storedHash?: string;
  expectedHash?: string;
  dataSnippet?: string;
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
      title: `Registro #${block.index}: contenido del sufragio alterado`,
      detail:
        "El hash SHA-256 guardado al emitir el sufragio ya no coincide con el hash recalculado a partir del contenido actual del bloque. " +
        "Esto ocurre cuando alguien modifica el voto (por ejemplo, cambia la opción o el DNI) sin volver a sellar el bloque con Proof of Work.",
      storedHash,
      expectedHash,
      dataSnippet: this.snippet(block.data),
    };
  }

  async execute() {
    const chain = await this.repository.load();
    const blocks = chain.getBlocks();
    const issues: string[] = [];
    const issueDetails: ValidationIssueDetail[] = [];

    const valid = chain.isValid((block, previous) => {
      if (!this.blockFactory.verify(block)) {
        const detail = this.hashMismatchIssue(block);
        issueDetails.push(detail);
        issues.push(
          `Registro #${block.index}: hash inválido — el contenido fue modificado sin recalcular la huella digital`,
        );
        return false;
      }
      if (previous && block.previousHash.toString() !== previous.hash.toString()) {
        const detail: ValidationIssueDetail = {
          blockIndex: block.index,
          kind: "broken_link",
          title: `Registro #${block.index}: enlace roto con el registro anterior`,
          detail:
            `El hash del registro #${block.index - 1} ya no coincide con el campo «hash anterior» de este bloque. ` +
            "La cadena dejó de ser continua (como si se hubiera insertado o reemplazado un eslabón).",
          storedHash: block.previousHash.toString(),
          expectedHash: previous.hash.toString(),
        };
        issueDetails.push(detail);
        issues.push(`Registro #${block.index}: enlace roto con el registro #${block.index - 1}`);
        return false;
      }
      if (block.index > 0 && block.nonce === 0) {
        const detail: ValidationIssueDetail = {
          blockIndex: block.index,
          kind: "pow_pending",
          title: `Registro #${block.index}: sufragio sin sellar (PoW)`,
          detail:
            "Este bloque tiene nonce 0: nunca se completó la prueba de trabajo al registrar el voto. " +
            "En producción, un sufragio debe quedar sellado antes de formar parte del escrutinio.",
          dataSnippet: this.snippet(block.data),
        };
        issueDetails.push(detail);
        issues.push(`Registro #${block.index}: sufragio sin sellar (PoW pendiente)`);
        return false;
      }
      if (
        block.index > 0 &&
        block.nonce > 0 &&
        !this.hashService.meetsDifficulty(block.hash.toString(), this.difficulty)
      ) {
        const detail: ValidationIssueDetail = {
          blockIndex: block.index,
          kind: "pow_invalid",
          title: `Registro #${block.index}: sellado PoW insuficiente`,
          detail:
            `El hash del registro #${block.index} no cumple la dificultad actual (${this.difficulty} ceros iniciales). ` +
            "El bloque no fue minado con el nivel de prueba de trabajo exigido.",
          storedHash: block.hash.toString(),
          dataSnippet: this.snippet(block.data),
        };
        issueDetails.push(detail);
        issues.push(`Registro #${block.index}: hash minado no cumple dificultad PoW`);
        return false;
      }
      return true;
    });

    const howItWorks =
      "Al emitir un sufragio, el sistema calcula SHA-256(index + timestamp + contenido + hashAnterior + nonce) " +
      "y guarda esa huella como hash del bloque. Al auditar, vuelve a calcular la misma fórmula: si el contenido " +
      "cambió pero el hash no se actualizó, la comparación falla y se reporta alteración.";

    return {
      valid,
      length: blocks.length,
      issues,
      issueDetails,
      message: valid
        ? "El registro electoral es íntegro. Ningún voto fue alterado."
        : issueDetails.length === 1
          ? `Alteración detectada en el registro #${issueDetails[0].blockIndex}.`
          : `Alteración detectada en ${issueDetails.length} registro(s) de la cadena.`,
      howItWorks,
    };
  }
}
