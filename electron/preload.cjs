const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sportsEdgeDesktop", {
  isDesktop: true,
  listPanels: () => ipcRenderer.invoke("sportsedge-desktop:list-panels"),
  isAuthenticated: () => ipcRenderer.invoke("sportsedge-desktop:is-authenticated"),
  openPanel: (route) => ipcRenderer.invoke("sportsedge-desktop:open-panel", route),
  onAuthRequired: (callback) => {
    const listener = (_event, route) => callback(route);
    ipcRenderer.on("sportsedge-desktop-auth-required", listener);
    return () => ipcRenderer.removeListener("sportsedge-desktop-auth-required", listener);
  }
});
