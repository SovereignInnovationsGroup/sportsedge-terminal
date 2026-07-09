const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const path = require("node:path");

const isDev = Boolean(process.env.SPORTSEDGE_DESKTOP_DEV_SERVER);
const devServerUrl = process.env.SPORTSEDGE_DESKTOP_DEV_SERVER || "";
const remoteTerminalUrl = process.env.SPORTSEDGE_DESKTOP_URL || "https://terminal.sportsedge.markets/";
const windows = new Set();
const panelBounds = new Map();

const panels = [
  { id: "dashboard", label: "Dashboard", route: "#dashboard", width: 1440, height: 920 },
  { id: "news", label: "News", route: "#news", width: 1180, height: 860 },
  { id: "football", label: "Football", route: "#football", width: 1360, height: 900 },
  { id: "bias-matrix", label: "Bias Matrix", route: "#bias-matrix", width: 1280, height: 820 },
  { id: "signals", label: "Signals", route: "#signals", width: 1160, height: 740 },
  { id: "profiles", label: "Football Profiles", route: "#football-profiles", width: 1320, height: 860 },
  { id: "settings", label: "Settings", route: "#settings", width: 900, height: 720 },
  { id: "admin", label: "Admin", route: "#admin", width: 1280, height: 860 }
];

function appUrl(route = "#desktop") {
  if (isDev) return `${devServerUrl.replace(/\/$/, "")}/${route}`;
  if (process.env.SPORTSEDGE_DESKTOP_LOCAL_BUILD === "1") {
    return `file://${path.join(__dirname, "..", "build", "index.html")}${route}`;
  }
  return `${remoteTerminalUrl.replace(/\/$/, "")}/${route}`;
}

function panelForRoute(route) {
  return panels.find((panel) => panel.route === route || panel.id === route.replace(/^#/, "")) || {
    id: route.replace(/^#/, "") || "panel",
    label: "SportsEdge Panel",
    route,
    width: 1280,
    height: 820
  };
}

async function hasSession(win) {
  if (!win || win.isDestroyed()) return false;
  try {
    return Boolean(await win.webContents.executeJavaScript(
      "Boolean(window.localStorage.getItem('sportsedge.auth.token'))",
      true
    ));
  } catch {
    return false;
  }
}

function rememberBounds(id, win) {
  if (!win || win.isDestroyed()) return;
  panelBounds.set(id, win.getBounds());
}

function createWindow(panel, options = {}) {
  const remembered = panelBounds.get(panel.id);
  const win = new BrowserWindow({
    title: `SportsEdge - ${panel.label}`,
    width: remembered?.width || panel.width,
    height: remembered?.height || panel.height,
    x: remembered?.x,
    y: remembered?.y,
    minWidth: 720,
    minHeight: 520,
    backgroundColor: "#05070a",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    ...options
  });

  windows.add(win);
  win.once("ready-to-show", () => win.show());
  win.on("close", () => rememberBounds(panel.id, win));
  win.on("closed", () => windows.delete(win));
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    const allowed = isDev
      ? url.startsWith(devServerUrl)
      : url.startsWith(remoteTerminalUrl) || url.startsWith("file://");
    if (!allowed) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  win.loadURL(appUrl(panel.route));
  return win;
}

function launcherWindow() {
  const existing = [...windows].find((win) => !win.isDestroyed() && win.webContents.getURL().includes("#desktop"));
  if (existing) {
    existing.focus();
    return existing;
  }
  return createWindow({ id: "desktop", label: "Panels", route: "#desktop", width: 1120, height: 760 });
}

function loginWindow() {
  return createWindow({ id: "login", label: "Login", route: "#login", width: 560, height: 720 }, {
    resizable: true,
    minWidth: 480,
    minHeight: 620
  });
}

async function openPanel(route, senderWindow) {
  const sourceWindow = senderWindow || BrowserWindow.getFocusedWindow();
  if (!(await hasSession(sourceWindow))) {
    const launcher = launcherWindow();
    launcher.webContents.once("did-finish-load", () => {
      launcher.webContents.send("sportsedge-desktop-auth-required", route);
    });
    return { ok: false, reason: "auth-required" };
  }
  const panel = panelForRoute(route);
  createWindow(panel);
  return { ok: true };
}

async function openLayout(layout, senderWindow) {
  for (const route of layout.routes) {
    await openPanel(route, senderWindow);
  }
}

function buildMenu() {
  const panelSubmenu = panels.map((panel) => ({
    label: panel.label,
    click: (_menuItem, browserWindow) => openPanel(panel.route, browserWindow)
  }));

  const layouts = [
    { label: "Trading Desk", routes: ["#dashboard", "#bias-matrix", "#signals", "#news"] },
    { label: "Football Desk", routes: ["#football", "#football-profiles", "#bias-matrix", "#football-news"] },
    { label: "News Desk", routes: ["#news", "#dashboard"] }
  ];

  return Menu.buildFromTemplate([
    ...(process.platform === "darwin" ? [{ role: "appMenu" }] : []),
    {
      label: "SportsEdge",
      submenu: [
        { label: "Login", accelerator: "CmdOrCtrl+Shift+L", click: loginWindow },
        { label: "Panel Launcher", accelerator: "CmdOrCtrl+L", click: launcherWindow },
        { type: "separator" },
        { label: "Settings", accelerator: "CmdOrCtrl+,", click: (_menuItem, browserWindow) => openPanel("#settings", browserWindow) },
        { type: "separator" },
        { role: "quit" }
      ]
    },
    {
      label: "Panels",
      submenu: panelSubmenu.map((item, index) => ({
        ...item,
        accelerator: index < 9 ? `CmdOrCtrl+${index + 1}` : undefined
      }))
    },
    {
      label: "Layouts",
      submenu: layouts.map((layout) => ({
        label: layout.label,
        click: (_menuItem, browserWindow) => openLayout(layout, browserWindow)
      }))
    },
    {
      label: "Account",
      submenu: [
        { label: "Sign In", click: loginWindow },
        { label: "Account Settings", click: (_menuItem, browserWindow) => openPanel("#settings", browserWindow) },
        { type: "separator" },
        {
          label: "Sign Out",
          click: (_menuItem, browserWindow) => {
            if (!browserWindow || browserWindow.isDestroyed()) return loginWindow();
            browserWindow.webContents.executeJavaScript([
              "window.localStorage.removeItem('sportsedge.auth.token')",
              "window.localStorage.removeItem('sportsedge.auth.user')",
              "window.location.hash = '#login'"
            ].join(";"), true);
          }
        }
      ]
    },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" }
  ]);
}

ipcMain.handle("sportsedge-desktop:open-panel", (event, route) => {
  return openPanel(String(route || "#dashboard"), BrowserWindow.fromWebContents(event.sender));
});

ipcMain.handle("sportsedge-desktop:list-panels", () => panels);

ipcMain.handle("sportsedge-desktop:is-authenticated", async (event) => {
  return hasSession(BrowserWindow.fromWebContents(event.sender));
});

app.whenReady().then(() => {
  app.setName("SportsEdge");
  Menu.setApplicationMenu(buildMenu());
  loginWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) launcherWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
