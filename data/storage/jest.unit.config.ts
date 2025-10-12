import baseConfig from './jest.config';
import { Config } from 'jest';

const unitConfig: Config = {
    ...baseConfig,
    displayName: "@notes-app/storage-service/test-unit",
    testMatch: ["<rootDir>/test/unit/**/**.test.ts"],
    coverageDirectory: '../../coverage/data/storage/unit',
}

export default unitConfig;