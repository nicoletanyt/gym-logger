export type ThemePreference = "system" | "light" | "dark";
export const THEME_STORAGE_KEY = "gym-logger-theme";

let currentPreference: ThemePreference = "system";
let unpersistedPreference = false;

function isPreference(value: string | null): value is ThemePreference {
    return value === "system" || value === "light" || value === "dark";
}

export function getThemePreference(): ThemePreference {
    if (typeof window === "undefined") return "system";
    if (unpersistedPreference) return currentPreference;
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        return isPreference(stored) ? stored : "system";
    } catch {
        return currentPreference;
    }
}

function applyTheme(preference: ThemePreference) {
    const dark = preference === "dark" || (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
}

export function setThemePreference(preference: ThemePreference) {
    currentPreference = preference;
    try {
        localStorage.setItem(THEME_STORAGE_KEY, preference);
        unpersistedPreference = false;
    } catch {
        unpersistedPreference = true;
    }
    applyTheme(preference);
}

export function initializeTheme() {
    currentPreference = getThemePreference();
    applyTheme(currentPreference);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => { if (currentPreference === "system") applyTheme(currentPreference); };
    const onStorage = (event: StorageEvent) => {
        if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
        unpersistedPreference = false;
        currentPreference = isPreference(event.newValue) ? event.newValue : "system";
        applyTheme(currentPreference);
    };
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => {
        media.removeEventListener("change", onSystemChange);
        window.removeEventListener("storage", onStorage);
    };
}
