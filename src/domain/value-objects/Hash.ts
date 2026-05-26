export class Hash {
  private constructor(private readonly value: string) {}

  static create(value: string): Hash {
    if (!/^[a-f0-9]{64}$/i.test(value)) {
      throw new Error("Hash inválido: debe ser SHA-256 hex (64 caracteres)");
    }
    return new Hash(value.toLowerCase());
  }

  static genesis(): Hash {
    return new Hash("0".repeat(64));
  }

  toString(): string {
    return this.value;
  }

  startsWith(prefix: string): boolean {
    return this.value.startsWith(prefix);
  }
}
