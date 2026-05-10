import type { Config } from 'jest';
import baseConfig from './jest.config';

const config: Config = {
  ...baseConfig,
  testMatch: ['<rootDir>/test/unit/**/*.spec.ts'],
  coverageDirectory: '../coverage/unit',
};

export default config;

