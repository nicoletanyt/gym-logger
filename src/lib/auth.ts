// Only accept same-origin relative destinations, including after email callbacks.
export function safeNext(value: string | null | undefined): string {
    if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return "/";
    try {
        const url = new URL(value, "https://gym-logger.invalid");
        if (url.origin !== "https://gym-logger.invalid" || url.pathname.startsWith("//") || url.pathname.startsWith("/auth/") || url.pathname === "/sign-in") return "/";
        return url.pathname + url.search + url.hash;
    } catch {
        return "/";
    }
}
