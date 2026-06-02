import { IsOptional, IsString, Length, Matches } from "class-validator";

export class VerifyVoterDto {
  @IsString()
  @Length(8, 8)
  @Matches(/^\d{8}$/, { message: "El DNI debe tener 8 dígitos numéricos" })
  dni!: string;

  /** DD/MM/AAAA — requerido si la API de identidad devuelve fecha de nacimiento */
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}\/\d{2}\/\d{4}$/, { message: "Use formato DD/MM/AAAA" })
  birthDate?: string;
}
