import { PrismaService } from '../../src/infra/prisma/prisma.service';

describe('PrismaService.transactional', () => {
  let service: PrismaService;

  beforeEach(() => {
    process.env.DATABASE_URL =
      'postgresql://licensing:licensing@localhost:5432/licensing_portal?schema=public';
    service = new PrismaService();

    // Prevent actual DB connection in unit tests
    service.$connect = jest.fn().mockResolvedValue(undefined);
    service.$disconnect = jest.fn().mockResolvedValue(undefined);
  });

  it('calls $transaction with Serializable isolation by default', async () => {
    const result = Symbol('result');
    const fn = jest.fn().mockResolvedValue(result);

    service.$transaction = jest.fn().mockResolvedValue(result) as typeof service.$transaction;

    const returned = await service.transactional(fn);

    expect(service.$transaction).toHaveBeenCalledWith(fn, {
      isolationLevel: 'Serializable',
    });
    expect(returned).toBe(result);
  });

  it('uses a custom isolation level when provided', async () => {
    service.$transaction = jest.fn().mockResolvedValue('ok') as typeof service.$transaction;

    await service.transactional(jest.fn(), { isolationLevel: 'RepeatableRead' });

    expect(service.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'RepeatableRead',
    });
  });
});
