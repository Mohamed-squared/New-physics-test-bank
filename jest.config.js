// jest.config.js
module.exports = {
    testEnvironment: 'jest-environment-jsdom',
    // To handle ES Modules. Jest's native ESM support is getting better,
    // but for complex projects with global browser variables and older patterns,
    // using Babel can simplify things.
    // If you want to try native ESM first (might require more setup):
    // transform: {},
    // experimentalSpecifierResolution: 'node', // For Node.js to resolve extensionless imports etc.
  
    // Common setup for mocking globals and handling ES modules via Babel:
    transform: {
      '^.+\\.js$': 'babel-jest', // Use babel-jest to transpile JS files
    },
    // If using Babel, you'll need to install these:
    // npm install --save-dev babel-jest @babel/core @babel/preset-env
  
    setupFilesAfterEnv: ['./jest.setup.js'], // For global mocks/setup after environment
    moduleNameMapper: {
      // If you have path aliases (doesn't seem to be the case here yet)
    },
    // Ignore transformation for libraries loaded via CDN as they might not be standard JS modules
    transformIgnorePatterns: [
      '/node_modules/',
      'https://cdn.jsdelivr.net/npm/'
    ],
  };