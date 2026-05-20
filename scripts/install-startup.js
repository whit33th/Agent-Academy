const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const startupDir = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
const vbsPath = path.join(startupDir, 'valorant-sync.vbs');
const scriptPath = path.resolve(__dirname, 'companion.js');

// In VBScript, double quotes inside strings are escaped by doubling them ("") instead of backslashes (\")
const vbsContent = `Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "node ""${scriptPath}""", 0, false
`;

try {
  fs.writeFileSync(vbsPath, vbsContent, 'utf-8');
  console.log(`Successfully installed startup script at: ${vbsPath}`);
  
  // Launch the VBS script right now so it starts running immediately in the background
  exec(`wscript.exe "${vbsPath}"`, (err) => {
    if (err) {
      console.error("Failed to launch background process:", err);
    } else {
      console.log("VALORANT Sync Companion is now running in the background!");
    }
  });
} catch (err) {
  console.error("Failed to install startup script:", err);
}
