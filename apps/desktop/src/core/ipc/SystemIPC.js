/**
 * System IPC Module
 * Handles system information and profile-related IPC calls
 */

const path = require('path');
const os = require('os');
const errorHandler = require('../../error_handler');

class SystemIPC {
  constructor(options = {}) {
    this.ipcMain = options.ipcMain;
    this.app = options.app;
    this.__dirname = options.__dirname;
    this.settings = options.settings;
    this.modelDownloader = options.modelDownloader;
  }

  register() {
    this.registerSystemInfoHandler();
    this.registerSystemProfileHandler();
    this.registerMicrophoneHandler();
    this.registerAppVersionHandler();
    this.registerUpdateCheckHandler();
  }

  registerSystemInfoHandler() {
    this.ipcMain.handle('system:get-info', async () => {
      function getNodeSystemInfo() {
        try {
          const cpus = os.cpus();
          const cpuModel = cpus && cpus.length > 0 ? cpus[0].model : 'Unknown';
          const cpuCount = cpus ? cpus.length : 0;

          return {
            Device: os.hostname() || 'Unknown',
            OS: `${os.type()} ${os.release()}` || 'Unknown',
            CPU: cpuModel || 'Unknown',
            Cores: cpuCount || 'N/A',
            Threads: cpuCount || 'N/A',
            RAM: `${(os.totalmem() / (1024 ** 3)).toFixed(1)} GB`,
            GPU: 'N/A',
            Arch: os.arch() || 'Unknown',
            'App Version': 'SONU v3.0.0'
          };
        } catch (e) {
          return {
            Device: 'Unknown', OS: 'Unknown', CPU: 'Unknown',
            Cores: 'N/A', Threads: 'N/A', RAM: 'N/A',
            GPU: 'N/A', Arch: 'Unknown', 'App Version': 'SONU v3.0.0'
          };
        }
      }

      try {
        const systemUtilsPath = path.join(this.__dirname, 'src', 'core', 'python', 'system_utils.py');
        const pythonCommands = ['python3', 'python'];

        for (const pythonCmd of pythonCommands) {
          try {
            const pythonProcess = errorHandler.safeSpawn(pythonCmd, [systemUtilsPath, 'info'], {
              stdio: ['pipe', 'pipe', 'pipe'],
              shell: process.platform === 'win32'
            });
            let output = '';

            pythonProcess.stdout.on('data', (data) => output += data.toString());

            const result = await new Promise((resolve) => {
              pythonProcess.on('close', (code) => {
                if (code === 0 && output && output.trim()) {
                  try {
                    resolve({ success: true, info: JSON.parse(output.trim()) });
                  } catch (e) {
                    resolve({ success: false });
                  }
                } else {
                  resolve({ success: false });
                }
              });
            });

            if (result.success) return result.info;
          } catch (e) {
            continue;
          }
        }
        return getNodeSystemInfo();
      } catch (e) {
        return getNodeSystemInfo();
      }
    });
  }

  registerSystemProfileHandler() {
    const getModelRecommendation = (ramGB, cpuCount) => {
      if (ramGB < 4 || cpuCount <= 2) {
        return { family: "Whisper", model: "tiny", reason: "Optimized for low-spec systems" };
      } else if (ramGB < 16 || cpuCount <= 6) {
        return { family: "Whisper", model: "tiny", reason: "Optimized for speed" };
      } else if (ramGB < 32) {
        return { family: "Whisper", model: "small", reason: "Balanced performance" };
      } else {
        return { family: "Whisper", model: "medium", reason: "High-performance" };
      }
    };

    this.ipcMain.handle('system:get-profile', async () => {
      const cpuCount = os.cpus().length;
      const ramGB = Math.round(os.totalmem() / (1024 ** 3));
      return {
        os: process.platform,
        cpu_cores: cpuCount,
        ram_gb: ramGB,
        gpu: false,
        recommended: getModelRecommendation(ramGB, cpuCount)
      };
    });

    this.ipcMain.handle('model:suggest', async () => {
      try {
        return this.modelDownloader ? this.modelDownloader.getRecommendedModel() : 'base';
      } catch (error) {
        return 'base';
      }
    });
  }

  registerMicrophoneHandler() {
    this.ipcMain.handle('microphone:list', async () => {
      return [{ name: 'Auto-detect (Audio)', id: 'default' }];
    });
  }

  registerAppVersionHandler() {
    this.ipcMain.handle('app:get-version', async () => this.app.getVersion());
  }

  registerUpdateCheckHandler() {
    const { shell } = require('electron');
    this.ipcMain.handle('app:check-updates', async () => {
      shell.openExternal('https://github.com/muhib-karim/sonu/releases');
      return { hasUpdate: false, checked: true };
    });
  }
}

module.exports = SystemIPC;
