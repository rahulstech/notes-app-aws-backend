import baseConfig from './jest.config';
import { Config } from 'jest';

const unitConfig: Config = {
    ...baseConfig,
    displayName: "@notes-app/queue-service/test-unit",
    testMatch: ["<rootDir>/test/unit/**/**.test.ts"],
    coverageDirectory: '../../coverage/data/queue/unit',
}

export default unitConfig;