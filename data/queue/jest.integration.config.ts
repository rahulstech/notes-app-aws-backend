import baseConfig from './jest.config';
import { Config } from 'jest';

const integrationConfig: Config = {
    ...baseConfig,
    displayName: "@notes-app/queue-service/test-integration",
    testMatch: ["<rootDir>/test/integration/**/**.test.ts"],
    coverageDirectory: '../../coverage/data/queue/integration',
    testTimeout: 30000, // 30 sec
}

export default integrationConfig;