export default {
  testEnvironment: "node",
  collectCoverageFrom: [
    "src/**/*.js",
    "scripts/**/*.js",
    "!**/node_modules/**",
    "!**/dist/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  testMatch: ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  verbose: true,
  testTimeout: 10000,
  transform: {
    "^.+\\.js$": [
      "babel-jest",
      {
        presets: [["@babel/preset-env", { targets: { node: "current" } }]],
      },
    ],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
