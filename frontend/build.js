const execSync = require('child_process').execSync;
const path = require('path');

// Ensure we're in the frontend directory
process.chdir(__dirname);

// Install dependencies
console.log('Installing dependencies...');
execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });

// Run the build
console.log('Building the application...');
const reactScriptsPath = path.join(__dirname, 'node_modules', 'react-scripts', 'scripts', 'build.js');
require(reactScriptsPath);
