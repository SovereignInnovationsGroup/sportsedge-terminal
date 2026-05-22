export function hasTerminalSession() {
  return Boolean(window.localStorage.getItem("sportsedge.auth.token"));
}

export function clearTerminalSession() {
  window.localStorage.removeItem("sportsedge.auth.token");
  window.localStorage.removeItem("sportsedge.auth.user");
}
