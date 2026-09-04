import { Address4, Address6 } from 'ip-address';
import { URL } from 'url';

export function isPrivateIp(ip: string): boolean {
  try {
    if (Address4.isValid(ip)) {
      const addr = new Address4(ip);
      // Private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8
      return addr.isInSubnet(new Address4('10.0.0.0/8')) ||
             addr.isInSubnet(new Address4('172.16.0.0/12')) ||
             addr.isInSubnet(new Address4('192.168.0.0/16')) ||
             addr.isInSubnet(new Address4('127.0.0.0/8')) ||
             addr.isInSubnet(new Address4('169.254.0.0/16'));
    }
    if (Address6.isValid(ip)) {
      const addr = new Address6(ip);
      return addr.isLoopback() || addr.isLinkLocal() || addr.isMulticast();
    }
    return false;
  } catch {
    return false;
  }
}

export function validateUrl(targetUrl: string, options: { allowPrivate?: boolean } = {}): URL {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new Error(`Invalid URL format: ${targetUrl}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Invalid protocol: ${parsed.protocol}`);
  }

  if (!options.allowPrivate) {
    // In a real app we'd resolve DNS and check the IP. Here we check if hostname looks like private IP or localhost.
    if (parsed.hostname === 'localhost' || parsed.hostname.endsWith('.local') || isPrivateIp(parsed.hostname)) {
      throw new Error(`SSRF Protection: Access to private/local network is denied`);
    }
  }

  return parsed;
}
