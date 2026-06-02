import { BadRequestException, Injectable } from "@nestjs/common";
import { DniLookupService } from "./dni-lookup.service";
import type { VerifyVoterDto } from "./dto/verify-voter.dto";

export type VoterResponse = {
  dni: string;
  birthDate: string | null;
  fullName: string;
  mesa: string;
  localVotacion: string;
  distrito: string;
  provincia: string;
  departamento: string;
  identitySource: string;
  birthDateVerified: boolean;
};

@Injectable()
export class VoterService {
  constructor(private readonly dniLookup: DniLookupService) {}

  config() {
    return {
      configured: this.dniLookup.isConfigured(),
      provider: process.env.DNI_API_PROVIDER ?? "apiperu",
    };
  }

  async verify(dto: VerifyVoterDto): Promise<VoterResponse> {
    const identity = await this.dniLookup.lookup(dto.dni);
    const { mesa, localVotacion } = this.dniLookup.deriveElectoralAssignment(dto.dni, identity);

    let birthDateVerified = false;
    if (identity.birthDate) {
      if (!dto.birthDate) {
        throw new BadRequestException(
          "Ingrese su fecha de nacimiento para completar la verificación de identidad.",
        );
      }
      if (dto.birthDate !== identity.birthDate) {
        throw new BadRequestException(
          "La fecha de nacimiento no coincide con el registro de identidad.",
        );
      }
      birthDateVerified = true;
    }

    return {
      dni: dto.dni,
      birthDate: identity.birthDate ?? dto.birthDate ?? null,
      fullName: identity.fullName,
      mesa,
      localVotacion,
      distrito: identity.distrito,
      provincia: identity.provincia,
      departamento: identity.departamento,
      identitySource: identity.source,
      birthDateVerified,
    };
  }
}
