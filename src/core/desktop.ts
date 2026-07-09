export type DesktopPanel = {
  id: string;
  label: string;
  route: string;
  width: number;
  height: number;
};

export type SportsEdgeDesktopBridge = {
  isDesktop: true;
  listPanels: () => Promise<DesktopPanel[]>;
  isAuthenticated: () => Promise<boolean>;
  openPanel: (route: string) => Promise<{ ok: boolean; reason?: string }>;
  closeWindow: () => Promise<void>;
  onAuthRequired: (callback: (route: string) => void) => () => void;
};

declare global {
  interface Window {
    sportsEdgeDesktop?: SportsEdgeDesktopBridge;
  }
}

export function sportsEdgeDesktop() {
  return window.sportsEdgeDesktop;
}
