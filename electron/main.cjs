const path = require("node:path");
const { app, BrowserWindow, dialog, shell } = require("electron");

let serverHandle;
let mainWindow;

app.setName("MNLSavior");

async function createWindow() {
  const userDataPath = app.getPath("userData");
  const legacyUserDataPath = path.join(app.getPath("appData"), "Configurador Huurre");
  process.env.HOLDED_CONFIG_DIR = userDataPath;
  process.env.HOLDED_LEGACY_CONFIG_DIR = legacyUserDataPath;
  process.env.HUURRE_DATA_DIR = userDataPath;
  process.env.HUURRE_LEGACY_DATA_DIR = legacyUserDataPath;
  process.env.HUURRE_APP_ROOT = path.join(__dirname, "..");

  const { startServer } = await import("../src/server.js");
  serverHandle = await startServer({ port: 0, host: "127.0.0.1" });

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    title: "MNLSavior",
    backgroundColor: "#08100f",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  await mainWindow.loadURL(serverHandle.url);
}

app.whenReady().then(createWindow).catch((error) => {
  console.error(error);
  dialog.showErrorBox("MNLSavior no ha pogut arrencar", error.stack || error.message);
  app.quit();
});

app.on("window-all-closed", () => {
  if (serverHandle?.server) {
    serverHandle.server.close();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
