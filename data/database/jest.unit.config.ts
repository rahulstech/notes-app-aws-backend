import baseConfig from './jest.config';
import { Config } from 'jest';

const unitConfig: Config = {
    ...baseConfig,
    displayName: "@notes-app/database-service/test-unit",
    testMatch: ["<rootDir>/test/unit/**/**.test.ts"],
    coverageDirectory: '../../coverage/data/database/unit',
}

export default unitConfig;