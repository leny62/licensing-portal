import { Test } from '@nestjs/testing';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infra/prisma/prisma.service';

const setRequiredEnv = (): void => {
  process.env.DATABASE_URL =
    'postgresql://licensing:licensing@localhost:5432/licensing_portal?schema=public';
  process.env.JWT_PRIVATE_KEY_BASE64 = Buffer.from('private-key').toString('base64');
  process.env.JWT_PUBLIC_KEY_BASE64 = Buffer.from('public-key').toString('base64');
  process.env.DOCUMENT_KEK_BASE64 = Buffer.alloc(32, 1).toString('base64');
};

const mockPrismaService = {
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

describe('AppModule', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    setRequiredEnv();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('compiles the root module without a live database', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    expect(moduleRef).toBeDefined();

    await moduleRef.close();
  });
});
