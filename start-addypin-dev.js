#!/usr/bin/env node
// 🎯 Programmatic Terribic Method Implementation
const { spawn } = require('child_process');

console.log('🚀 Starting AddyPin with Terribic Method (Programmatic)');
console.log('====================================================');

// Set environment variable
process.env.ADDYPIN_DB_PASSWORD = "UBih+0YllInCRul3liIlMXHiezktiq8vGXbZ9CiAljA=";

// Step 1: Run tunnel manager
const tunnelProcess = spawn('./tunnel_manager.sh', [], { 
  stdio: 'inherit',
  shell: true 
});

tunnelProcess.on('close', (code) => {
  if (code === 0) {
    console.log('🏃 Starting development server...');
    
    // Step 2: Run the actual dev server
    const devProcess = spawn('NODE_ENV=development', ['tsx', 'server/index.ts'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_ENV: 'development' }
    });
    
    // Forward process signals
    process.on('SIGINT', () => devProcess.kill('SIGINT'));
    process.on('SIGTERM', () => devProcess.kill('SIGTERM'));
    
  } else {
    console.error('❌ Tunnel setup failed');
    process.exit(1);
  }
});