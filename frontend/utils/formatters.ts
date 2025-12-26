/**
 * Utility functions for formatting data in the Xandeum frontend
 */

/**
 * Convert TB to appropriate unit (TB, GB, MB)
 * @param tb - Storage in terabytes
 * @returns Formatted string with appropriate unit
 */
export function formatStorage(tb: number): string {
    if (tb >= 1) return `${tb.toFixed(2)} TB`;
    if (tb >= 0.001) return `${(tb * 1024).toFixed(2)} GB`;
    return `${(tb * 1024 * 1024).toFixed(2)} MB`;
}

/**
 * Convert TB to GB
 * @param tb - Storage in terabytes
 * @returns Storage in gigabytes
 */
export function tbToGb(tb: number): number {
    return tb * 1024;
}

/**
 * Convert TB to MB
 * @param tb - Storage in terabytes
 * @returns Storage in megabytes
 */
export function tbToMb(tb: number): number {
    return tb * 1024 * 1024;
}

/**
 * Format timestamp to readable date
 * @param ts - Unix timestamp (milliseconds)
 * @returns Formatted date string
 */
export function formatTimestamp(ts: number): string {
    return new Date(ts).toLocaleString();
}

/**
 * Format timestamp to relative time (e.g., "2 hours ago")
 * @param ts - Unix timestamp (milliseconds)
 * @returns Relative time string
 */
export function formatRelativeTime(ts: number): string {
    const now = Date.now();
    const diff = now - ts;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
}

/**
 * Format uptime percentage
 * @param percent - Uptime percentage
 * @returns Formatted percentage string
 */
export function formatUptime(percent: number): string {
    return `${percent.toFixed(2)}%`;
}

/**
 * Get color class for latency based on value
 * @param ms - Latency in milliseconds
 * @returns Tailwind color class
 */
export function getLatencyColor(ms: number): string {
    if (ms < 50) return 'text-secondary';
    if (ms < 100) return 'text-yellow-500';
    return 'text-accent';
}

/**
 * Get color class for uptime based on percentage
 * @param percent - Uptime percentage
 * @returns Tailwind color class
 */
export function getUptimeColor(percent: number): string {
    if (percent >= 99) return 'text-secondary';
    if (percent >= 95) return 'text-yellow-500';
    return 'text-accent';
}

/**
 * Get color class for storage utilization
 * @param usedTb - Used storage in TB
 * @param totalTb - Total storage in TB
 * @returns Tailwind color class
 */
export function getStorageColor(usedTb: number, totalTb: number): string {
    const percent = (usedTb / totalTb) * 100;
    if (percent < 70) return 'text-secondary';
    if (percent < 85) return 'text-yellow-500';
    return 'text-accent';
}

/**
 * Format large numbers with commas
 * @param num - Number to format
 * @returns Formatted number string
 */
export function formatNumber(num: number): string {
    return num.toLocaleString();
}

/**
 * Truncate public key for display
 * @param pubkey - Full public key
 * @param startChars - Number of characters to show at start
 * @param endChars - Number of characters to show at end
 * @returns Truncated pubkey
 */
export function truncatePubkey(
    pubkey: string,
    startChars: number = 8,
    endChars: number = 6
): string {
    if (pubkey.length <= startChars + endChars) return pubkey;
    return `${pubkey.slice(0, startChars)}...${pubkey.slice(-endChars)}`;
}
