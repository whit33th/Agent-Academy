module.exports = {
  appId: 'com.whit33th.agentacademy.native',
  productName: 'Agent Academy',
  electronVersion: '44.9.0',
  directories: { app: 'desktop', output: 'release' },
  files: ['dist/**/*', 'package.json', '!node_modules/**/*'],
  npmRebuild: false,
  extraResources: [
    { from: 'desktop-build/web', to: 'web', filter: ['**/*', '!**/.env*', '!**/*.pem', '!**/*.key', '!**/*.pfx'] },
    { from: 'desktop-build/web/node_modules', to: 'web/node_modules', filter: ['**/*', '!**/.env*'] },
  ],
  protocols: [{ name: 'Agent Academy sign-in', schemes: ['agent-academy'] }],
  asar: true,
  win: { icon: 'public/valorant-icon.png', target: [{ target: 'nsis', arch: ['x64'] }], artifactName: 'Agent-Academy-Setup-${version}.${ext}' },
  nsis: { oneClick: false, perMachine: false, allowToChangeInstallationDirectory: true, deleteAppDataOnUninstall: false },
};
