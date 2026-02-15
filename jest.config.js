// jest.config.js
module.exports = {
    verbose: true,
    transform: {
        '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: { allowJs: true } }],
    },
    transformIgnorePatterns: ['/node_modules/(?!(file-url)/)'],
    testPathIgnorePatterns: ['/build/', '/node_modules/'],
    testRegex: '/__tests__/.*\\.test\\.ts$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    testEnvironment: 'node',
}
