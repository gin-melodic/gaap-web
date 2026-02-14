/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const protoRoot = path.resolve(projectRoot, '../gaap-api/manifest/protobuf');
const outDir = path.resolve(projectRoot, 'src/lib/proto');
const pluginPath = path.resolve(projectRoot, 'node_modules/.bin/protoc-gen-ts_proto' + (process.platform === 'win32' ? '.cmd' : ''));

function getFiles(dir, extension, files = []) {
  if (!fs.existsSync(dir)) return files;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, extension, files);
    } else if (name.endsWith(extension)) {
      // Use relative path from protoRoot for protoc, ensuring forward slashes
      const relativePath = path.relative(protoRoot, name).split(path.sep).join('/');
      files.push(relativePath);
    }
  }
  return files;
}

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log(`Searching for .proto files in ${protoRoot}...`);
const protoFiles = getFiles(protoRoot, '.proto');

if (protoFiles.length === 0) {
  console.error('No .proto files found in', protoRoot);
  process.exit(1);
}

const command = [
  'protoc',
  `--plugin=protoc-gen-ts_proto="${pluginPath}"`,
  `--ts_proto_out="${outDir}"`,
  `--proto_path="${protoRoot}"`,
  ...protoFiles.map(f => `"${f}"`),
  '--ts_proto_opt=esModuleInterop=true,forceLong=string'
].join(' ');

console.log(`Generating ${protoFiles.length} protos...`);
try {
  execSync(command, { cwd: protoRoot, stdio: 'inherit' });
  console.log('Successfully generated protos.');
} catch {
  console.error('Error generating protos.');
  process.exit(1);
}
