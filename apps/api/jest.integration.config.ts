import type { Config } from 'jest';
import baseConfig from './jest.config';

const config: Config = {
  ...baseConfig,
  testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
  coverageDirectory: '../coverage/integration',
};

export default config;

