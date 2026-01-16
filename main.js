const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

// Determine the correct paths for both development and production
const isDev = !app.isPackaged
const DIST_ELECTRON = path.join(__dirname)
const DIST = path.join(DIST_ELECTRON, '../dist')

let win

function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        autoHideMenuBar: true,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#00000000',
            symbolColor: '#ffffff'
        }
    })

    // Load the app
    if (isDev && process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL)
        // win.webContents.openDevTools() // Uncomment for debugging
    } else {
        win.loadFile(path.join(DIST, 'index.html'))
    }
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

// IPC Handlers
const CONFIG_PATH = path.join(os.homedir(), '.config', 'opencode', 'opencode.json');

ipcMain.handle('get-config', async () => {
    try {
        // Default config structure
        const defaultConfig = {
            "$schema": "https://opencode.ai/config.json",
            "provider": {}
        };

        // If config file doesn't exist, create it with default structure
        if (!fs.existsSync(CONFIG_PATH)) {
            const dir = path.dirname(CONFIG_PATH);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 4), 'utf-8');
            return defaultConfig;
        }

        let data = fs.readFileSync(CONFIG_PATH, 'utf-8');
        // Remove trailing commas to make it valid JSON
        data = data.replace(/,(\s*[}\]])/g, '$1');
        const parsed = JSON.parse(data);

        // Ensure provider key exists
        if (!parsed.provider) {
            parsed.provider = {};
        }

        return parsed;
    } catch (error) {
        console.error("Error reading config:", error);
        return { error: error.message };
    }
});

ipcMain.handle('save-config', async (event, newConfig) => {
    try {
        // Ensure directory exists
        const dir = path.dirname(CONFIG_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 4), 'utf-8');
        return { success: true };
    } catch (error) {
        console.error("Error saving config:", error);
        return { error: error.message };
    }
});

// Get environment variable value
ipcMain.handle('get-env-var', async (event, name) => {
    return process.env[name] || '';
});

// Set environment variable (cross-platform)
const { exec } = require('child_process');

ipcMain.handle('set-env-var', async (event, { name, value }) => {
    return new Promise((resolve) => {
        if (process.platform === 'win32') {
            // Windows: Use setx to set user environment variable
            exec(`setx ${name} "${value}"`, (error, stdout, stderr) => {
                if (error) {
                    console.error('Error setting env var:', error);
                    resolve({ error: error.message });
                } else {
                    console.log('Env var set:', stdout);
                    // Update current process env immediately so changes are visible without restart
                    process.env[name] = value;
                    resolve({ success: true });
                }
            });
        } else {
            // macOS/Linux: Append to shell profile
            const homeDir = os.homedir();
            let profilePath;

            // Determine which shell profile to use
            if (process.platform === 'darwin') {
                // macOS: prefer .zshrc (default on macOS Catalina+), fallback to .bash_profile
                profilePath = fs.existsSync(path.join(homeDir, '.zshrc'))
                    ? path.join(homeDir, '.zshrc')
                    : path.join(homeDir, '.bash_profile');
            } else {
                // Linux: prefer .bashrc, fallback to .profile
                profilePath = fs.existsSync(path.join(homeDir, '.bashrc'))
                    ? path.join(homeDir, '.bashrc')
                    : path.join(homeDir, '.profile');
            }

            try {
                const exportLine = `\nexport ${name}="${value}"\n`;
                const content = fs.existsSync(profilePath) ? fs.readFileSync(profilePath, 'utf-8') : '';

                // Check if variable already exists, update it
                const regex = new RegExp(`^export ${name}=.*$`, 'm');
                let newContent;
                if (regex.test(content)) {
                    newContent = content.replace(regex, `export ${name}="${value}"`);
                } else {
                    newContent = content + exportLine;
                }

                fs.writeFileSync(profilePath, newContent, 'utf-8');
                console.log(`Env var written to ${profilePath}`);
                // Update current process env immediately
                process.env[name] = value;
                resolve({ success: true, profilePath });
            } catch (error) {
                console.error('Error writing to profile:', error);
                resolve({ error: error.message });
            }
        }
    });
});

app.whenReady().then(createWindow)
