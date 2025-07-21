#!/usr/bin/env node
// Script to add CI/CD related dev dependencies

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Add additional dev dependencies for CI/CD
const additionalDevDeps = {
  "@playwright/test": "^1.40.0",
  "@testing-library/jest-dom": "^6.1.5",
  "@testing-library/react": "^14.1.2",
  "@testing-library/user-event": "^14.5.1",
  "@typescript-eslint/eslint-plugin": "^6.13.2",
  "@typescript-eslint/parser": "^6.13.2",
  "@vitest/coverage-v8": "^0.34.6",
  "@vitest/ui": "^0.34.6",
  "eslint-config-prettier": "^9.1.0",
  "eslint-plugin-react": "^7.33.2",
  "eslint-plugin-react-hooks": "^4.6.0",
  "eslint-plugin-react-refresh": "^0.4.5",
  "husky": "^8.0.3",
  "jsdom": "^23.0.1",
  "lint-staged": "^15.2.0",
  "prettier": "^3.1.1",
  "prettier-plugin-tailwindcss": "^0.5.9",
  "rollup-plugin-visualizer": "^5.12.0",
  "typescript": "^5.3.3",
  "vitest": "^0.34.6"
};

// Merge with existing devDependencies
packageJson.devDependencies = {
  ...packageJson.devDependencies,
  ...additionalDevDeps
};

// Add lint-staged configuration
packageJson['lint-staged'] = {
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md,css}": [
    "prettier --write"
  ]
};

// Write updated package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('✅ Added CI/CD dev dependencies to package.json');
console.log('Run "npm install" or "pnpm install" to install the new dependencies');
