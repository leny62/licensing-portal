import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { KeyProvider } from './interfaces/key-provider.interface';

@Injectable()
export class EnvKeyProvider implements KeyProvider {
  constructor(private readonly configService: ConfigService) {}

  getPrivateKey(): string {
    return this.configService.getOrThrow<string>('jwt.privateKey');
  }

  getPublicKey(): string {
    return this.configService.getOrThrow<string>('jwt.publicKey');
  }

  getKid(): string {
    return this.configService.getOrThrow<string>('jwt.kid');
  }
}
