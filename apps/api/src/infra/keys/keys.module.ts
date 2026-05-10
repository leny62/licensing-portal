import { Global, Module } from '@nestjs/common';

import { EnvKeyProvider } from './env-key-provider';
import { KEY_PROVIDER } from './keys.tokens';

@Global()
@Module({
  providers: [
    EnvKeyProvider,
    {
      provide: KEY_PROVIDER,
      useExisting: EnvKeyProvider,
    },
  ],
  exports: [KEY_PROVIDER],
})
export class KeysModule {}
