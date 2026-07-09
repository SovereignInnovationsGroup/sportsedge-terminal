const { app, BrowserWindow, Menu, ipcMain, shell, screen } = require("electron");
const path = require("node:path");

const isDev = Boolean(process.env.SPORTSEDGE_DESKTOP_DEV_SERVER);
const devServerUrl = process.env.SPORTSEDGE_DESKTOP_DEV_SERVER || "";
const remoteTerminalUrl = process.env.SPORTSEDGE_DESKTOP_URL || "https://terminal.sportsedge.markets/";
const windows = new Set();
const panelWindows = new Map();
const panelBounds = new Map();
let menuBarWindow = null;

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
    frame: false,
    titleBarStyle: "hidden",
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
  win.on("close", () => {
    if (!options.skipBoundsMemory) rememberBounds(panel.id, win);
  });
  win.on("closed", () => {
    windows.delete(win);
    if (panelWindows.get(panel.id) === win) panelWindows.delete(panel.id);
    if (menuBarWindow === win) menuBarWindow = null;
  });
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

function createMenuBarWindow() {
  if (menuBarWindow && !menuBarWindow.isDestroyed()) {
    menuBarWindow.focus();
    return menuBarWindow;
  }
  const display = screen.getPrimaryDisplay();
  const { x, y, width } = display.workArea;
  menuBarWindow = createWindow({ id: "desktop-menu", label: "Menu", route: "#desktop-menu", width, height: 54 }, {
    x,
    y,
    width,
    height: 54,
    minWidth: 900,
    minHeight: 54,
    maxHeight: 54,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    skipBoundsMemory: true,
    trafficLightPosition: { x: -100, y: -100 }
  });
  menuBarWindow.setAlwaysOnTop(true, "screen-saver");
  menuBarWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  return menuBarWindow;
}

function loginWindow() {
  const existing = panelWindows.get("login");
  if (existing && !existing.isDestroyed()) {
    existing.focus();
    return existing;
  }
  const win = createWindow({ id: "login", label: "Login", route: "#login", width: 620, height: 760 }, {
    resizable: true,
    minWidth: 540,
    minHeight: 680,
    trafficLightPosition: { x: 18, y: 18 }
  });
  panelWindows.set("login", win);
  return win;
}

async function openPanel(route, senderWindow) {
  const sourceWindow = senderWindow || menuBarWindow || createMenuBarWindow();
  if (!(await hasSession(sourceWindow))) {
    const login = loginWindow();
    login.webContents.once("did-finish-load", () => {
      login.webContents.send("sportsedge-desktop-auth-required", route);
    });
    return { ok: false, reason: "auth-required" };
  }
  const panel = panelForRoute(route);
  const existing = panelWindows.get(panel.id);
  if (existing && !existing.isDestroyed()) {
    existing.focus();
    return { ok: true };
  }
  const win = createWindow(panel, {
    trafficLightPosition: { x: -100, y: -100 }
  });
  panelWindows.set(panel.id, win);
  return { ok: true };
}

async function openLayout(layout, senderWindow) {
  await openPanel(layout.routes[0] || "#dashboard", senderWindow);
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
        { label: "Menu Bar", accelerator: "CmdOrCtrl+Shift+M", click: createMenuBarWindow },
        { label: "Login", accelerator: "CmdOrCtrl+Shift+L", click: loginWindow },
        { label: "Dashboard", accelerator: "CmdOrCtrl+L", click: (_menuItem, browserWindow) => openPanel("#dashboard", browserWindow) },
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

ipcMain.handle("sportsedge-desktop:close-window", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed() && win !== menuBarWindow) win.close();
});

app.whenReady().then(() => {
  app.setName("SportsEdge");
  Menu.setApplicationMenu(buildMenu());
  createMenuBarWindow();

  app.on("activate", () => {
    if (!menuBarWindow || menuBarWindow.isDestroyed()) createMenuBarWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
