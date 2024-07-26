const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packageJsonPath = path.resolve(__dirname, '../package.json');
const packageJson = require(packageJsonPath);

const version = packageJson.version;
const commitHash = execSync('git rev-parse --short HEAD').toString().trim();

const envContent = `
NEXT_PUBLIC_APP_VERSION=${version}
NEXT_PUBLIC_COMMIT_HASH=${commitHash}
`;

fs.writeFileSync(path.resolve(__dirname, '../.env.local'), envContent, { flag: 'a' });

