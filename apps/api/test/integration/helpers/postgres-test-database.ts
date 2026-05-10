import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { PostgreSqlContainer } from '@testcontainers/postgresql';

export interface StartedTestDatabase {
  url: string;
  stop: () => Promise<void>;
}

const getFreePort = async (): Promise<number> => {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      if (address === null || typeof address === 'string') {
        server.close();
        reject(new Error('Unable to allocate a local Postgres port.'));
        return;
      }

      server.close(() => resolve(address.port));
    });
  });
};

const startLocalPostgres = async (): Promise<StartedTestDatabase> => {
  const port = await getFreePort();
  const baseDir = mkdtempSync(path.join(tmpdir(), 'licensing-postgres-'));
  const dataDir = path.join(baseDir, 'data');
  const logPath = path.join(baseDir, 'postgres.log');
  const postgresEnv = { ...process.env, LANG: 'C', LC_ALL: 'C' };

  execFileSync('initdb', ['-D', dataDir, '-A', 'trust', '-U', 'licensing'], {
    env: postgresEnv,
    stdio: 'pipe',
  });

  execFileSync(
    'pg_ctl',
    ['-D', dataDir, '-l', logPath, '-o', `-p ${port} -k ${baseDir}`, '-w', 'start'],
    {
      env: postgresEnv,
      stdio: 'pipe',
    },
  );

  execFileSync(
    'createdb',
    ['-h', '127.0.0.1', '-p', String(port), '-U', 'licensing', 'licensing_portal'],
    {
      env: postgresEnv,
      stdio: 'pipe',
    },
  );

  return {
    url: `postgresql://licensing:licensing@127.0.0.1:${port}/licensing_portal?schema=public`,
    stop: async () => {
      execFileSync('pg_ctl', ['-D', dataDir, '-m', 'fast', '-w', 'stop'], {
        env: postgresEnv,
        stdio: 'pipe',
      });
      rmSync(baseDir, { force: true, recursive: true });
    },
  };
};

export const startPostgres = async (): Promise<StartedTestDatabase> => {
  try {
    const container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('licensing_portal')
      .withUsername('licensing')
      .withPassword('licensing')
      .start();

    return {
      url: container.getConnectionUri(),
      stop: async () => {
        await container.stop();
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (!message.includes('container runtime')) {
      throw error;
    }

    return startLocalPostgres();
  }
};

export const applyMigrations = (databaseUrl: string): void => {
  const repoRoot = path.resolve(__dirname, '../../../../..');
  const apiRoot = path.resolve(__dirname, '../../..');

  execFileSync(
    path.join(repoRoot, 'node_modules/.bin/prisma'),
    ['migrate', 'deploy', '--schema', path.join(apiRoot, 'prisma/schema')],
    {
      cwd: repoRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'pipe',
    },
  );
};
