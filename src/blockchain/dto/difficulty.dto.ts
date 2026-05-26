import { IsInt, Max, Min } from "class-validator";

export class SetDifficultyDto {
  @IsInt()
  @Min(1)
  @Max(6)
  difficulty!: number;
}
