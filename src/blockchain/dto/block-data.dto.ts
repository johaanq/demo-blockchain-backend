import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class BlockDataDto {
  @IsString()
  @IsNotEmpty()
  data!: string;
}

export class TamperBlockDto {
  @IsInt()
  @Min(0)
  index!: number;

  @IsString()
  @IsNotEmpty()
  data!: string;
}
