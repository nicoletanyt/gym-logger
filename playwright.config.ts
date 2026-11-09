import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "tests/browser",
    use: { baseURL: "http://127.0.0.1:4174", headless: true },
    webServer: {
        // Frontend only. No Docker or local Supabase/database is started.
        command: "npm run dev -- --host 127.0.0.1 --port 4174 --strictPort",
        url: "http://127.0.0.1:4174/sign-in",
        reuseExistingServer: false,
        timeout: 30000,
    },
});
