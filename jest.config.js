module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/*.test.ts'], // Optional: match .test.ts files
    collectCoverage: true, // Enable coverage collection
    collectCoverageFrom: [
        "src/**/*.{ts,tsx}", // Specify the files to collect coverage from
        "!src/**/*.d.ts", // Exclude type definition files
        "!src/**/*.test.ts", // Exclude test files
    ],
    coverageDirectory: "coverage", // Output directory for coverage reports
    coverageReporters: ["text", "lcov"], // Specify the format of the coverage report
};