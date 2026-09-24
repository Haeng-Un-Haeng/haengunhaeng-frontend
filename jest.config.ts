import type { Config } from 'jest';
import nextJest from 'next/jest.js';
// next/jest를 사용하면 Next.js Compiler 기반 transform,
// CSS·이미지·next/font 처리, .next 제외 같은 기본 설정을 직접 전부 작성하지 않아도 된다.

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};

export default createJestConfig(config);
