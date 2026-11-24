<?php

namespace App\Services;

use InvalidArgumentException;

class SsrfProtectionService
{
    /**
     * Check if a URL is safe to fetch (not loopback, private, or cloud metadata).
     */
    public function isSafe(string $url): bool
    {
        try {
            $this->validateUrl($url);
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Validate and return normalized safe URL, or throw InvalidArgumentException.
     *
     * @throws InvalidArgumentException
     */
    public function validateUrl(string $url): string
    {
        $url = trim($url);
        if (empty($url)) {
            throw new InvalidArgumentException('URL cannot be empty.');
        }

        $parts = parse_url($url);
        if (!$parts || empty($parts['scheme']) || empty($parts['host'])) {
            throw new InvalidArgumentException('Malformed URL: scheme and host are required.');
        }

        $scheme = strtolower($parts['scheme']);
        if (!in_array($scheme, ['http', 'https'], true)) {
            throw new InvalidArgumentException("Unsafe URL scheme: '{$scheme}'. Only http and https are allowed.");
        }

        $host = strtolower($parts['host']);

        // Check for literal IP or localhost name
        if ($host === 'localhost' || $host === 'localhost.localdomain') {
            throw new InvalidArgumentException("Host '{$host}' is a forbidden local address.");
        }

        // Resolve DNS records (IPv4 & IPv6)
        $ips = [];
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            $ips[] = $host;
        } else {
            $recordsA = @dns_get_record($host, DNS_A);
            if ($recordsA) {
                foreach ($recordsA as $r) {
                    if (isset($r['ip'])) {
                        $ips[] = $r['ip'];
                    }
                }
            }
            $recordsAaaa = @dns_get_record($host, DNS_AAAA);
            if ($recordsAaaa) {
                foreach ($recordsAaaa as $r) {
                    if (isset($r['ipv6'])) {
                        $ips[] = $r['ipv6'];
                    }
                }
            }

            // Fallback to gethostbynamel
            if (empty($ips)) {
                $resolved = @gethostbynamel($host);
                if ($resolved) {
                    $ips = array_merge($ips, $resolved);
                }
            }
        }

        if (empty($ips)) {
            throw new InvalidArgumentException("Could not resolve host: '{$host}'.");
        }

        foreach ($ips as $ip) {
            if ($this->isForbiddenIp($ip)) {
                throw new InvalidArgumentException("Resolved IP '{$ip}' for host '{$host}' is in a private, loopback, or metadata range.");
            }
        }

        return $url;
    }

    /**
     * Check if an IP address belongs to loopback, private, metadata, or reserved ranges.
     */
    public function isForbiddenIp(string $ip): bool
    {
        // Check IPv4
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            // Check flags: no private range, no reserved range
            if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return true;
            }

            $long = ip2long($ip);
            if ($long === false) {
                return true;
            }

            // Explicit checks:
            // 127.0.0.0/8 (Loopback)
            if (($long & 0xFF000000) === 0x7F000000) {
                return true;
            }
            // 0.0.0.0/8
            if (($long & 0xFF000000) === 0x00000000) {
                return true;
            }
            // 10.0.0.0/8 (RFC1918)
            if (($long & 0xFF000000) === 0x0A000000) {
                return true;
            }
            // 172.16.0.0/12 (RFC1918)
            if (($long & 0xFFF00000) === 0xAC100000) {
                return true;
            }
            // 192.168.0.0/16 (RFC1918)
            if (($long & 0xFFFF0000) === 0xC0A80000) {
                return true;
            }
            // 169.254.0.0/16 (Link-local & AWS/Cloud Metadata 169.254.169.254)
            if (($long & 0xFFFF0000) === 0xA9FE0000) {
                return true;
            }
            // 100.64.0.0/10 (Shared address / CGNAT)
            if (($long & 0xFFC00000) === 0x64400000) {
                return true;
            }
            // 224.0.0.0/4 (Multicast)
            if (($long & 0xF0000000) === 0xE0000000) {
                return true;
            }
            // 240.0.0.0/4 (Reserved)
            if (($long & 0xF0000000) === 0xF0000000) {
                return true;
            }

            return false;
        }

        // Check IPv6
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            // Check flags: no private, no reserved
            if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return true;
            }

            $packed = inet_pton($ip);
            if ($packed === false) {
                return true;
            }

            // ::1 (Loopback)
            if ($ip === '::1' || $packed === inet_pton('::1')) {
                return true;
            }
            // :: (Unspecified)
            if ($ip === '::' || $packed === inet_pton('::')) {
                return true;
            }

            // IPv4-mapped IPv6 (::ffff:x.x.x.x)
            if (str_starts_with($ip, '::ffff:')) {
                $ipv4Part = substr($ip, 7);
                if (filter_var($ipv4Part, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                    return $this->isForbiddenIp($ipv4Part);
                }
            }

            // Unique local fc00::/7
            $firstByte = ord($packed[0]);
            if (($firstByte & 0xFE) === 0xFC) {
                return true;
            }

            // Link-local fe80::/10
            if ($firstByte === 0xFE && (ord($packed[1]) & 0xC0) === 0x80) {
                return true;
            }

            return false;
        }

        return true;
    }
}
