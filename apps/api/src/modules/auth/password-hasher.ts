import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordHasher {
  constructor(private readonly configService: ConfigService) {}

  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, this.options());
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }

  needsRehash(hash: string): boolean {
    return argon2.needsRehash(hash, this.options());
  }

  private options(): argon2.Options & { raw?: false } {
    return {
      type: argon2.argon2id,
      memoryCost: this.configService.getOrThrow<number>('argon2.memoryCost'),
      timeCost: this.configService.getOrThrow<number>('argon2.timeCost'),
      parallelism: this.configService.getOrThrow<number>('argon2.parallelism'),
    };
  }
}
