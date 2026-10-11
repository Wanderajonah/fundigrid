import Constants from 'expo-constants';

const API_PORT = 5000;

function hostnameOf(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const isIp = (host: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(host);

function withHost(host: string): string {
  return `http://${host}:${API_PORT}/api`;
}

function metroHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;
  const host = (hostUri || '').split('/')[0].split(':')[0];
  return host && isIp(host) ? host : null;
}

const envBase = (process.env.EXPO_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
const envHost = hostnameOf(envBase);
const devHost = metroHost();

// Hostnames (tunnel / production) in env are explicit, so they win.
// Raw IPs in env go stale whenever DHCP reassigns, so the device's Metro
// host is preferred over them and both stay on the candidate list.
const primary = envBase && envHost && !isIp(envHost) ? envBase : devHost ? withHost(devHost) : envBase;

const candidates = [primary, envBase, devHost ? withHost(devHost) : ''].filter(
  (base, i, arr): base is string => Boolean(base) && arr.indexOf(base) === i
);

// Last resort only — Metro's host (or EXPO_PUBLIC_API_URL) normally wins.
// Never hardcode the PC's IP here: DHCP reassigns it and the app goes dark.
let active = candidates[0] || `http://localhost:${API_PORT}/api`;

export function apiBase(): string {
  return active;
}

export function apiCandidates(): string[] {
  return candidates.length ? candidates : [active];
}

export function promoteApiBase(base: string) {
  active = base;
}
