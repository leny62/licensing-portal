export interface KeyProvider {
  getPrivateKey(): string;
  getPublicKey(): string;
  getKid(): string;
}
