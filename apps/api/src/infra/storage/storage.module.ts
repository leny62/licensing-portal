import { Global, Module } from '@nestjs/common';

import { EncryptedLocalStorage } from './encrypted-local-storage';
import { LocalKekProvider } from './local-kek-provider';
import { DOCUMENT_STORAGE, KEK_PROVIDER } from './storage.tokens';

@Global()
@Module({
  providers: [
    LocalKekProvider,
    EncryptedLocalStorage,
    {
      provide: KEK_PROVIDER,
      useExisting: LocalKekProvider,
    },
    {
      provide: DOCUMENT_STORAGE,
      useExisting: EncryptedLocalStorage,
    },
  ],
  exports: [DOCUMENT_STORAGE, KEK_PROVIDER],
})
export class StorageModule {}
