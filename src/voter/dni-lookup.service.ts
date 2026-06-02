import { BadGatewayException, BadRequestException, Injectable } from "@nestjs/common";

export type DniIdentity = {
  dni: string;
  fullName: string;
  birthDate: string | null;
  distrito: string;
  provincia: string;
  departamento: string;
  source: string;
};

type Provider = "apiperu" | "apidni" | "apisnetpe";

@Injectable()
export class DniLookupService {
  private get token(): string {
    return process.env.DNI_API_TOKEN?.trim() ?? "";
  }

  private get provider(): Provider {
    return (process.env.DNI_API_PROVIDER?.trim() ?? "apiperu") as Provider;
  }

  isConfigured(): boolean {
    return this.token.length > 0;
  }

  async lookup(dni: string): Promise<DniIdentity> {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        "Configure DNI_API_TOKEN en el backend. Regístrese gratis en https://apiperu.dev o use apidni.com para fecha de nacimiento.",
      );
    }

    switch (this.provider) {
      case "apidni":
        return this.lookupApidni(dni);
      case "apisnetpe":
        return this.lookupApisNetPe(dni);
      case "apiperu":
      default:
        return this.lookupApiPeru(dni);
    }
  }

  private async lookupApiPeru(dni: string): Promise<DniIdentity> {
    const res = await fetch("https://apiperu.dev/api/dni", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ dni }),
    });

    const body = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      data?: {
        nombre_completo?: string;
        nombres?: string;
        apellido_paterno?: string;
        apellido_materno?: string;
      };
    };

    if (!res.ok || !body.success || !body.data) {
      throw new BadGatewayException(
        body.message ?? "DNI no encontrado en el padrón consultado (apiperu.dev / SUNAT).",
      );
    }

    const d = body.data;
    const fullName =
      d.nombre_completo?.trim() ||
      [d.nombres, d.apellido_paterno, d.apellido_materno].filter(Boolean).join(" ").trim();

    if (!fullName) {
      throw new BadGatewayException("La API no devolvió nombre para este DNI.");
    }

    return {
      dni,
      fullName: this.titleCase(fullName),
      birthDate: null,
      distrito: "Consulta ONPE",
      provincia: "—",
      departamento: "Perú",
      source: "RENIEC — Registro de Identificación de Personas Naturales",
    };
  }

  private async lookupApidni(dni: string): Promise<DniIdentity> {
    const res = await fetch(`https://apidni.com/api/v2/dni/${dni}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.token}`,
      },
    });

    const body = (await res.json().catch(() => ({}))) as {
      codigo?: number;
      respuesta?: string;
      data?: {
        nombres?: string;
        apellido_paterno?: string;
        apellido_materno?: string;
        fecha_nacimiento?: string;
        distrito?: string;
        provincia?: string;
        departamento?: string;
      };
    };

    if (!res.ok || body.codigo !== 1 || !body.data) {
      throw new BadGatewayException(body.respuesta ?? "DNI no encontrado (apidni.com).");
    }

    const d = body.data;
    const fullName = [d.nombres, d.apellido_paterno, d.apellido_materno].filter(Boolean).join(" ");

    return {
      dni,
      fullName: this.titleCase(fullName),
      birthDate: d.fecha_nacimiento ? this.normalizeDate(d.fecha_nacimiento) : null,
      distrito: d.distrito?.trim() || "—",
      provincia: d.provincia?.trim() || "—",
      departamento: d.departamento?.trim() || "Perú",
      source: "RENIEC — Registro de Identificación de Personas Naturales",
    };
  }

  private async lookupApisNetPe(dni: string): Promise<DniIdentity> {
    const url = `https://api.apis.net.pe/v1/dni?numero=${dni}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.token}`,
      },
    });

    const body = (await res.json().catch(() => ({}))) as {
      nombre?: string;
      nombres?: string;
      apellidoPaterno?: string;
      apellidoMaterno?: string;
      distrito?: string;
      provincia?: string;
      departamento?: string;
    };

    if (!res.ok || (!body.nombre && !body.nombres)) {
      throw new BadGatewayException("DNI no encontrado (apis.net.pe).");
    }

    const fullName =
      body.nombre?.trim() ||
      [body.nombres, body.apellidoPaterno, body.apellidoMaterno].filter(Boolean).join(" ").trim();

    return {
      dni,
      fullName: this.titleCase(fullName),
      birthDate: null,
      distrito: body.distrito?.trim() || "—",
      provincia: body.provincia?.trim() || "—",
      departamento: body.departamento?.trim() || "Perú",
      source: "RENIEC — Registro de Identificación de Personas Naturales",
    };
  }

  /** Simula mesa y local del padrón ONPE a partir del DNI (la API real de mesa es aparte). */
  deriveElectoralAssignment(dni: string, identity: DniIdentity) {
    const n = Number(dni);
    const mesa = String(((n * 7919 + 12345) % 899999) + 100000);
    const localVotacion = `Local de votación asignado — ${identity.distrito}, ${identity.departamento}`;
    return { mesa, localVotacion };
  }

  private normalizeDate(raw: string): string {
    const parts = raw.replace(/-/g, "/").split("/");
    if (parts.length !== 3) return raw;
    const [a, b, c] = parts;
    if (c.length === 4) return `${a.padStart(2, "0")}/${b.padStart(2, "0")}/${c}`;
    if (a.length === 4) return `${b.padStart(2, "0")}/${c.padStart(2, "0")}/${a}`;
    return raw;
  }

  private titleCase(s: string): string {
    return s
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
}
