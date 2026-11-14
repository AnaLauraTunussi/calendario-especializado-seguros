/**
 * Testes do backend:
 * - unitarios:  src/**\/*.spec.ts — regras de negócio isoladas (dependências simuladas)
 * - integracao: test/**\/*.int-spec.ts — API completa via HTTP contra o PostgreSQL real
 */
const base = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: { '^.+\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  testEnvironment: 'node',
};

module.exports = {
  projects: [
    { ...base, displayName: 'unitarios', rootDir: '.', testMatch: ['<rootDir>/src/**/*.spec.ts'] },
    { ...base, displayName: 'integracao', rootDir: '.', testMatch: ['<rootDir>/test/**/*.int-spec.ts'] },
  ],
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/**/*.spec.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'json-summary'],
};
