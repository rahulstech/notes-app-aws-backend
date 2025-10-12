import { Config } from "jest";

export default {
  displayName: '@notes-app/storage-service',
  preset: '../../jest.preset.js',
  setupFilesAfterEnv: ['../../jest.setup.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
  moduleFileExtensions: ['ts', 'js'],
} as Config;
