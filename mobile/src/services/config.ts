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

// An explicit hostname in env (e.g. https://fundigrid.onrender.com/api) is a
// deliberate target: use it alone so development builds talk to the deployed
// backend instead of silently falling back to the LAN / Metro host.
const explicitTarget = Boolean(envBase && envHost && !isIp(envHost));

// Raw IPs in env go stale whenever DHCP reassigns, so with no explicit
// hostname the device's Metro host is preferred over them and both stay on
// the candidate list.
const primary = explicitTarget ? envBase : devHost ? withHost(devHost) : envBase;

const rest = explicitTarget ? [] : [envBase, devHost ? withHost(devHost) : ''];

const candidates = [primary, ...rest].filter(
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
