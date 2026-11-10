import { expect, test, type Page } from "@playwright/test";
import { Buffer } from "node:buffer";

// Test-only HTTP fixtures, not a local Supabase stack. No real accounts, JWTs,
// emails, or workout data are created or used.
const user = {
    id: "00000000-0000-4000-8000-000000000001", email: "loading@example.test",
    aud: "authenticated", role: "authenticated", created_at: "2026-01-01T00:00:00Z",
    app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {},
};
const accessToken = [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
    Buffer.from(JSON.stringify({ sub: user.id, aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url"),
    "test-signature-not-a-real-token",
].join(".");
const session = { access_token: accessToken, refresh_token: "test-refresh-token", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user };

async function mockSignIn(page: Page, mode: "success" | "failure" | "stalled" = "success") {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/auth/v1/**", (route) => route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify(new URL(route.request().url()).pathname.endsWith("/user") ? user : session),
    }));
    await page.route("**/rest/v1/**", (route) => {
        if (mode === "stalled") return; // Hold the read open until its AbortSignal fires.
        return route.fulfill({
            status: mode === "failure" ? 403 : 200, contentType: "application/json",
            body: mode === "failure" ? JSON.stringify({ message: "Test data service unavailable" }) : "[]",
        });
    });
    // SvelteKit's devalue-encoded root server-load result. The real server guard
    // is NOT bypassed by production code; only this browser's fetch is mocked.
    await page.route("**/__data.json**", (route) => route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ type: "data", nodes: [{ type: "data", data: [{ user: 1 }, { id: 2, email: 3 }, user.id, user.email], uses: { dependencies: ["supabase:auth"] } }, null] }),
    }));
    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill("test-password-123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    return errors;
}

test("successful empty workout responses replace the homepage loading state", async ({ page }) => {
    const errors = await mockSignIn(page);
    await expect(page.getByRole("heading", { name: "Gym Logger", exact: true })).toBeVisible();
    await expect(page.getByText("Total Sessions", { exact: true })).toBeVisible();
    await expect(page.getByText("Loading your workouts…", { exact: true })).toHaveCount(0);
    expect(errors).toEqual([]);
});

test("homepage actions and statistics work across viewport sizes", async ({ page }) => {
    await mockSignIn(page);
    for (const width of [320, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        const log = page.getByRole("link", { name: "Log Session" });
        const start = page.getByRole("link", { name: "Start Session" });
        const logBox = await log.boundingBox();
        const startBox = await start.boundingBox();
        expect(Math.abs(logBox!.y - startBox!.y)).toBeLessThan(2);
        expect(Math.abs(logBox!.width - startBox!.width)).toBeLessThan(2);
        await expect(start).toHaveClass(/border-border/);
        const stats = page.getByRole("region", { name: "Workout statistics" });
        for (const label of ["Total Sessions", "Avg time per session", "Streak", "Workouts this week"]) {
            await expect(stats.getByText(label, { exact: true })).toBeVisible();
        }
        await expect(stats.locator('[data-slot="card-title"]')).toHaveText(["Streak", "Workouts this week", "Total Sessions", "Avg time per session"]);
        for (const card of await stats.locator('[data-slot="card"]').all()) {
            const icon = await card.locator(":scope > svg").boundingBox();
            const title = await card.locator('[data-slot="card-title"]').boundingBox();
            const value = await card.locator('[data-slot="card-content"] p').boundingBox();
            expect(icon!.x + icon!.width).toBeLessThanOrEqual(title!.x);
            expect(value!.y).toBeGreaterThanOrEqual(title!.y + title!.height);
        }
        await expect(stats.getByText("Avg time per session").locator("../..")).toContainText("0s");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.evaluate(async () => {
        const modulePath = "/src/lib/cloud.svelte.ts";
        const { cloud } = await import(modulePath);
        const now = new Date();
        const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        cloud.data.sessions["test-session"] = { id: "test-session", date, duration: 1800, routineId: "custom", exercises: [] };
    });
    const stats = page.getByRole("region", { name: "Workout statistics" });
    await expect(stats.getByText("Total Sessions").locator("../..")).toContainText("1");
    await expect(stats.getByText("Avg time per session").locator("../..")).toContainText("30m");
    await expect(stats.getByText("Streak", { exact: true }).locator("../..")).toContainText("1 day");
    await expect(stats.getByText("Workouts this week").locator("../..")).toContainText("1");
    await page.evaluate(async () => {
        const modulePath = "/src/lib/cloud.svelte.ts";
        const { cloud } = await import(modulePath);
        cloud.data.sessions["second-session"] = { id: "second-session", date: "2025-01-01", duration: 600, routineId: "custom", exercises: [] };
    });
    await expect(stats.getByText("Total Sessions").locator("../..")).toContainText("2");
    await expect(stats.getByText("Avg time per session").locator("../..")).toContainText("20m");
    await page.getByRole("link", { name: "Start Session" }).click();
    await expect(page).toHaveURL(/\/sessions\/new$/);
    await page.getByRole("link", { name: "Home", exact: true }).click();
    await page.getByRole("link", { name: "Log Session" }).click();
    await expect(page).toHaveURL(/\/log$/);
});

test("appearance follows the system and supports saved overrides", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await mockSignIn(page);
    await expect(page.locator("html")).toHaveClass(/dark/);
    const font = await page.locator("body").evaluate((element) => getComputedStyle(element).fontFamily);
    expect(font).toContain("Public Sans");
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check('16px "Public Sans Variable"'))).toBe(true);
    const statContrast = await page.locator('[aria-label="Workout statistics"] [data-slot="card-title"]').evaluateAll((titles) => {
        function luminance(color: string) {
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = 1;
            const context = canvas.getContext("2d")!;
            context.fillStyle = color;
            context.fillRect(0, 0, 1, 1);
            const components = Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3).map((value) => value / 255);
            const linear = components.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
            return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
        }
        return titles.map((title) => {
            const text = luminance(getComputedStyle(title).color);
            const background = luminance(getComputedStyle(title.closest('[data-slot="card"]')!).backgroundColor);
            return (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);
        });
    });
    expect(statContrast).toHaveLength(4);
    expect(Math.min(...statContrast)).toBeGreaterThanOrEqual(4.5);
    await page.setViewportSize({ width: 390, height: 850 });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.locator("header").first().getByRole("button").click();
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Appearance" })).toContainText("System");
    await page.getByRole("button", { name: "Appearance" }).click();
    for (const option of ["System", "Light", "Dark"]) {
        await expect(page.getByRole("option", { name: option }).locator('svg[aria-hidden="true"]').first()).toBeVisible();
    }
    await page.getByRole("option", { name: "Light" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    expect(await page.evaluate(() => localStorage.getItem("gym-logger-theme"))).toBe("light");
    await page.getByRole("button", { name: "Appearance" }).click();
    await page.getByRole("option", { name: "Dark" }).click();
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("button", { name: "Appearance" }).click();
    await page.getByRole("option", { name: "System" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("link", { name: "Exercises", exact: true }).click();
    await page.getByRole("button", { name: "Add", exact: true }).click();
    const name = page.getByRole("textbox", { name: "Name", exact: true });
    await expect(name).toHaveCSS("background-color", "rgb(41, 46, 53)");
    await page.setViewportSize({ width: 390, height: 850 });
});

test("appearance changes synchronize across tabs", async ({ page, context }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await mockSignIn(page);
    await page.locator("header").first().getByRole("button").click();
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    const other = await context.newPage();
    await other.goto("/sign-in");
    await other.evaluate(() => localStorage.setItem("gym-logger-theme", "dark"));
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("button", { name: "Appearance" })).toContainText("Dark");
    await page.getByRole("button", { name: "Appearance" }).click();
    await page.getByRole("option", { name: "Light" }).click();
    await expect(other.locator("html")).not.toHaveClass(/dark/);
    await other.evaluate(() => localStorage.removeItem("gym-logger-theme"));
    await expect(page.getByRole("button", { name: "Appearance" })).toContainText("System");
    await other.close();
});

test("profile actions have icons, fit both themes, and keep exports working", async ({ page }) => {
    await mockSignIn(page);
    await page.evaluate(() => localStorage.setItem("SESSIONS_STORED", "[]"));
    await page.locator("header").first().getByRole("button").click();
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    for (const [width, theme] of [[320, "Light"], [1280, "Dark"]] as const) {
        await page.setViewportSize({ width, height: 900 });
        await page.getByRole("button", { name: "Appearance" }).click();
        await page.getByRole("option", { name: theme }).click();
        for (const name of ["Import Data", "Export Cloud Data", "Download Previous Browser Data", "Sign out"]) {
            const button = page.getByRole("button", { name, exact: true });
            await expect(button.locator('svg[aria-hidden="true"]')).toBeVisible();
            expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(48);
        }
        const changePassword = page.getByRole("link", { name: "Change Password" });
        await expect(changePassword.locator('svg[aria-hidden="true"]')).toBeVisible();
        await expect(changePassword).toHaveAttribute("href", "/reset-password");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    const cloudDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export Cloud Data" }).click();
    expect((await cloudDownload).suggestedFilename()).toBe("gym-logger-backup.json");
    const legacyDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download Previous Browser Data" }).click();
    expect((await legacyDownload).suggestedFilename()).toBe("gym-logger-local-backup.json");
    await page.getByRole("button", { name: "Import Data" }).click();
    await expect(page).toHaveURL(/\/import$/);
});

test("profile sign out returns to sign in", async ({ page }) => {
    await mockSignIn(page);
    await page.locator("header").first().getByRole("button").click();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/sign-in/);
});

test("JSON backup uploads validate and complete in a dismissible dialog", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await mockSignIn(page);
    await page.getByRole("button", { name: "Profile" }).click();
    await page.getByRole("button", { name: "Import Data" }).click();
    const input = page.getByLabel("Backup file");
    await expect(page.getByRole("button", { name: "Upload", exact: true })).toBeVisible();
    await input.setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from("{") });
    await expect(page.getByRole("alert")).toContainText("not valid JSON");
    await expect(page.getByRole("button", { name: "Import backup" })).toBeDisabled();
    for (const version of [1, "legacy-local"]) {
        await input.setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ version, exercises: [], routines: [], sessions: {} })) });
        await expect(page.getByText("0 exercises · 0 routines · 0 sessions")).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: test.info().outputPath(`backup-preview-${version}.png`), animations: "disabled" });
        await page.getByRole("button", { name: "Import backup" }).click();
        const dialog = page.getByRole("dialog", { name: "Import complete" });
        await expect(dialog).toContainText("Added 0 exercises, 0 routines and 0 sessions");
        await page.screenshot({ path: test.info().outputPath(`backup-complete-${version}.png`), animations: "disabled" });
        await dialog.getByRole("button", { name: "Done" }).click();
        await expect(dialog).not.toBeVisible();
    }
});

test("local export round-trips through JSON import without changing browser storage", async ({ page }) => {
    await mockSignIn(page);
    const stored = { EXERCISES_STORED: "[]", ROUTINES_STORED: "[]", SESSIONS_STORED: "{}" };
    await page.evaluate((stored) => { for (const [key, value] of Object.entries(stored)) localStorage.setItem(key, value); }, stored);
    await page.getByRole("button", { name: "Profile" }).click();
    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download Previous Browser Data" }).click();
    const download = await downloaded;
    const chunks: Buffer[] = [];
    for await (const chunk of (await download.createReadStream())!) chunks.push(Buffer.from(chunk));
    const buffer = Buffer.concat(chunks);
    expect(JSON.parse(buffer.toString())).toMatchObject({ version: "legacy-local", exercises: [], routines: [], sessions: {} });
    expect(await page.evaluate((keys) => Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)])), Object.keys(stored))).toEqual(stored);
    await page.getByRole("button", { name: "Import Data" }).click();
    await page.getByLabel("Backup file").setInputFiles({ name: download.suggestedFilename(), mimeType: "application/json", buffer });
    await expect(page.getByText("Previous browser-data backup", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Import backup" }).click();
    await expect(page.getByRole("dialog", { name: "Import complete" })).toBeVisible();
});

test("nonempty backups save exercises before routines and sessions and skip repeat imports", async ({ page }) => {
    await mockSignIn(page);
    const exerciseId = "00000000-0000-4000-8000-000000000010";
    const routineId = "00000000-0000-4000-8000-000000000011";
    const sessionId = "00000000-0000-4000-8000-000000000012";
    const entry = { id: "00000000-0000-4000-8000-000000000013", exerciseId, metric: { type: "weight", sets: 3, reps: 10, weight: 20 } };
    const backup = { version: 1, exercises: [{ id: exerciseId, name: "Press", metricType: "weight" }], routines: [{ id: routineId, name: "Day one", exercises: [entry] }], sessions: { [sessionId]: { id: sessionId, date: "2026-11-10", duration: 600, routineId, exercises: [entry] } } };
    const saved: Record<string, unknown[]> = { exercises: [], routines: [], sessions: [] };
    const methods: string[] = [];
    const rowEntry = { id: entry.id, exercise_id: exerciseId, position: 0, metric_type: "weight", sets: 3, reps: 10, weight_kg: 20, exercise_name_snapshot: "Press" };
    await page.route("**/rest/v1/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        const method = path.split("/").at(-1)!;
        if (path.includes("/rpc/")) {
            methods.push(method);
            if (method === "save_exercise") saved.exercises.push({ id: exerciseId, name: "Press", metric_type: "weight", archived: false, revision: 1 });
            if (method === "save_routine") saved.routines.push({ id: routineId, name: "Day one", revision: 1, routine_exercises: [rowEntry] });
            if (method === "save_session") saved.sessions.push({ id: sessionId, workout_date: "2026-11-10", duration_seconds: 600, routine_id: routineId, revision: 1, created_at: "2026-11-10T12:00:00Z", session_exercises: [rowEntry] });
            return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
        }
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(saved[method] ?? []) });
    });
    await page.getByRole("button", { name: "Profile" }).click();
    await page.getByRole("button", { name: "Import Data" }).click();
    for (const expected of ["Added 1 exercises, 1 routines and 1 sessions", "Skipped 3 existing records"]) {
        await page.getByLabel("Backup file").setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
        await page.getByRole("button", { name: "Import backup" }).click();
        const dialog = page.getByRole("dialog", { name: "Import complete" });
        await expect(dialog).toContainText(expected);
        await dialog.getByRole("button", { name: "Done" }).click();
    }
    expect(methods).toEqual(["save_exercise", "save_routine", "save_session"]);
});

test("exercise image picker supports library selection and upload validation", async ({ page }) => {
    await mockSignIn(page);
    await page.getByRole('link', { name: 'Exercises', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Exercises', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    const type = page.getByRole('combobox', { name: 'Exercise Type' });
    await type.click();
    const popover = page.locator('[data-slot="popover-content"]:visible');
    await expect.poll(async () => {
        const triggerBox = await type.boundingBox();
        const popoverBox = await popover.boundingBox();
        return triggerBox && popoverBox ? Math.abs(triggerBox.width - popoverBox.width) : Infinity;
    }).toBeLessThan(2);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Choose from library' }).click();
    await expect(page.getByRole('dialog', { name: 'Choose an exercise image' })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 850 });
    await page.getByRole('button', { name: 'Dumbbell', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Choose an exercise image' })).not.toBeVisible();
    await page.getByRole('button', { name: 'Choose from library' }).click();
    await expect(page.getByRole('button', { name: 'Dumbbell', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    const input = page.getByLabel('Upload a photo');
    await input.setInputFiles({ name: 'bad.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
    await expect(page.getByRole('alert')).toContainText('JPEG, PNG, or WebP');
    await input.setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('test image') });
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.getByRole('button', { name: 'Choose from library' }).click();
    await expect(page.getByRole('button', { name: 'Dumbbell', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Remove image' }).click();
    await expect(page.getByLabel('Selected exercise image')).toBeVisible();
});

test("creation page headers stay aligned on mobile and desktop", async ({ page }) => {
    await mockSignIn(page);
    for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 850 });
        await page.getByRole("link", { name: "Exercises", exact: true }).click();
        await page.getByRole("button", { name: "Add", exact: true }).click();
        const heading = page.getByRole("heading", { name: "Create Exercise" });
        const back = page.getByRole("button", { name: "Back", exact: true });
        await expect(page.getByRole("textbox", { name: "Name", exact: true }).locator("..").locator('svg[aria-hidden="true"]')).toBeVisible();
        await expect(page.getByRole("combobox", { name: "Exercise Type" }).locator("..").locator('svg[aria-hidden="true"]').first()).toBeVisible();
        await expect(page.getByRole("textbox", { name: "Note (optional)" }).locator("..").locator('svg[aria-hidden="true"]')).toBeVisible();
        const headingBox = await heading.boundingBox();
        const backBox = await back.boundingBox();
        expect(headingBox && backBox && Math.abs((headingBox.y + headingBox.height / 2) - (backBox.y + backBox.height / 2))).toBeLessThan(2);
        await back.click();
        await page.getByRole("link", { name: "Routines", exact: true }).click();
        await page.getByRole("button", { name: "Add", exact: true }).click();
        await expect(page.getByRole("textbox", { name: "Name", exact: true }).locator("..").locator('svg[aria-hidden="true"]')).toBeVisible();
        const routineHeading = await page.getByRole("heading", { name: "Create Routine" }).boundingBox();
        const routineBack = await page.getByRole("link", { name: "Back", exact: true }).boundingBox();
        expect(routineHeading && routineBack && Math.abs((routineHeading.y + routineHeading.height / 2) - (routineBack.y + routineBack.height / 2))).toBeLessThan(2);
    }
});

test("creation actions remain at the bottom of the scrollable page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 600 });
    await mockSignIn(page);
    for (const [section, action] of [["Exercises", "Add Exercise"], ["Routines", "Add Routine"]]) {
        await page.getByRole("link", { name: section, exact: true }).click();
        await page.getByRole("button", { name: "Add", exact: true }).click();
        const button = page.getByRole("button", { name: action, exact: true });
        const main = page.getByRole("main");
        const mainBox = await main.boundingBox();
        const buttonBox = await button.boundingBox();
        expect(buttonBox!.height).toBeGreaterThanOrEqual(48);
        expect(mainBox!.y + mainBox!.height - (buttonBox!.y + buttonBox!.height)).toBeLessThan(20);
        await main.evaluate((element) => { element.scrollTop = element.scrollHeight; });
        await expect(button).toBeInViewport();
    }
});

test("creation validation errors use destructive alerts", async ({ page }) => {
    await mockSignIn(page);
    await page.clock.install();
    await page.getByRole("link", { name: "Exercises", exact: true }).click();
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByRole("button", { name: "Add Exercise", exact: true }).click();
    await expect(page.locator('[data-slot="alert"][role="alert"]')).toContainText("Enter an exercise name.");
    const notification = await page.getByRole("button", { name: "Dismiss error notification" }).boundingBox();
    expect(notification!.y).toBeLessThanOrEqual(20);
    expect(page.viewportSize()!.width - notification!.x - notification!.width).toBeLessThanOrEqual(20);
    await page.getByRole("button", { name: "Dismiss error notification" }).click();
    await expect(page.locator('[data-slot="alert"][role="alert"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Add Exercise", exact: true }).click();
    await expect(page.locator('[data-slot="alert"][role="alert"]')).toBeVisible();
    await page.clock.fastForward(5_000);
    await expect(page.locator('[data-slot="alert"][role="alert"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("link", { name: "Routines", exact: true }).click();
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByRole("button", { name: "Add Routine", exact: true }).click();
    await expect(page.locator('[data-slot="alert"][role="alert"]')).toContainText("need to add exercises");
});

test("other page headers use the same compact back control", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await mockSignIn(page);
    async function checkHeader(title: string) {
        const back = page.getByRole("link", { name: "Back", exact: true });
        const heading = page.getByRole("heading", { name: title, exact: true });
        const backBox = await back.boundingBox();
        const headingBox = await heading.boundingBox();
        expect(backBox!.width).toBeCloseTo(backBox!.height, 0);
        expect(Math.abs((backBox!.y + backBox!.height / 2) - (headingBox!.y + headingBox!.height / 2))).toBeLessThan(2);
    }
    await page.getByRole("link", { name: "Log Session" }).click();
    await checkHeader("Log Session");
    await page.getByRole("link", { name: "Back", exact: true }).click();
    await page.getByRole("link", { name: "Start Session" }).click();
    await checkHeader("New Session");
    await page.getByRole("link", { name: "Back", exact: true }).click();
    await page.locator("header").first().getByRole("button").click();
    await checkHeader("Profile");
    await page.getByRole("button", { name: "Import Data" }).click();
    await checkHeader("Import Data");
});

test("session fields use stacked, full-width labels and controls", async ({ page }) => {
    await mockSignIn(page);
    for (const width of [320, 1280]) {
        await page.setViewportSize({ width, height: 800 });
        await page.getByRole("link", { name: "Home", exact: true }).click();
        await page.getByRole("link", { name: "Log Session" }).click();
        await expect(page.getByRole("heading", { name: "Log Session" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Add Session" })).toBeInViewport();
        for (const label of ["Duration (mins)", "Date"]) {
            const input = page.getByLabel(label, { exact: true });
            await expect(input.locator("..").locator('svg[aria-hidden="true"]')).toBeVisible();
            const labelBox = await page.getByText(label, { exact: true }).boundingBox();
            const inputBox = await input.boundingBox();
            expect(inputBox!.y).toBeGreaterThanOrEqual(labelBox!.y + labelBox!.height);
            expect(Math.abs(inputBox!.x - labelBox!.x)).toBeLessThan(2);
        }
        const dateBox = await page.getByLabel("Date", { exact: true }).boundingBox();
        const routineBox = await page.getByRole("combobox", { name: "Routine" }).boundingBox();
        await expect(page.getByRole("combobox", { name: "Routine" }).locator("..").locator('svg[aria-hidden="true"]').first()).toBeVisible();
        expect(Math.abs(dateBox!.width - routineBox!.width)).toBeLessThan(2);
        await page.getByRole("link", { name: "Back", exact: true }).click();
        await page.getByRole("link", { name: "Start Session" }).click();
        await expect(page.getByLabel("Date", { exact: true })).toBeVisible();
        await expect(page.getByRole("combobox", { name: "Routine" })).toBeVisible();
    }
});

test("log session shows the metric type after selection and images on added exercises", async ({ page }) => {
    await mockSignIn(page);
    await page.evaluate(async () => {
        const modulePath = "/src/lib/cloud.svelte.ts";
        const { cloud } = await import(modulePath);
        cloud.data.exercises.push(
            { id: "00000000-0000-4000-8000-000000000011", name: "Dumbbell press", metricType: "weight", imageLink: "/exercise-images/dumbbell.jpg" },
            { id: "00000000-0000-4000-8000-000000000012", name: "Unpictured exercise", metricType: "weight", imageLink: "" },
        );
    });
    await page.getByRole("link", { name: "Log Session" }).click();
    await page.getByRole("button", { name: "Add exercise", exact: true }).click();
    await page.getByRole("combobox", { name: "Exercise" }).click();
    await expect(page.getByRole("option", { name: "Dumbbell press" }).locator("img")).toHaveCount(0);
    await expect(page.getByRole("option", { name: "Unpictured exercise" }).locator("img")).toHaveCount(0);
    await page.getByRole("option", { name: "Dumbbell press" }).click();
    await expect(page.getByRole("dialog", { name: "Add Exercise" }).getByText("Weight", { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 800 });
    await page.getByLabel("Sets", { exact: true }).fill("3");
    await page.getByLabel("Weight (kg)", { exact: true }).fill("20");
    await page.getByLabel("Reps", { exact: true }).fill("10");
    await page.getByRole("dialog", { name: "Add Exercise" }).getByRole("button", { name: "Add Exercise", exact: true }).click();
    await expect(page.locator('main img[src="/exercise-images/dumbbell.jpg"]')).toBeVisible();
});

test("exercise entry adapts fields, validates, and preserves prior values", async ({ page }) => {
    await mockSignIn(page);
    await page.evaluate(async () => {
        const modulePath = "/src/lib/cloud.svelte.ts";
        const { cloud } = await import(modulePath);
        cloud.data.exercises.push(
            { id: "weight-id", name: "Bench press", metricType: "weight", imageLink: "" },
            { id: "reps-id", name: "Push ups", metricType: "reps", imageLink: "" },
            { id: "duration-id", name: "Plank", metricType: "duration", imageLink: "" },
            { id: "cardio-id", name: "Running", metricType: "cardio", imageLink: "" },
        );
        cloud.data.sessions["previous"] = { id: "previous", date: "2026-01-01", duration: 1200, routineId: "custom", exercises: [
            { id: "entry", exerciseId: "weight-id", metric: { type: "weight", sets: 3, reps: 8, weight: 25 } },
        ] };
    });
    await page.getByRole("link", { name: "Routines", exact: true }).click();
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByRole("button", { name: "Add exercise", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Add Exercise" });
    await expect(sheet.getByLabel("Sets", { exact: true })).toHaveCount(0);
    await sheet.getByRole("button", { name: "Add Exercise", exact: true }).click();
    await expect(sheet.getByRole("alert")).toContainText("Choose an exercise first.");
    await sheet.getByRole("button", { name: "Dismiss error notification" }).click();
    async function choose(name: string) {
        await sheet.getByRole("combobox", { name: "Exercise" }).click();
        await page.getByRole("option", { name, exact: true }).click();
    }
    await choose("Push ups");
    await expect(sheet.getByLabel("Sets", { exact: true })).toHaveValue("");
    await expect(sheet.getByLabel("Reps", { exact: true })).toHaveValue("");
    await expect(sheet.getByLabel("Weight (kg)")).toHaveCount(0);
    await sheet.getByRole("button", { name: "Add Exercise", exact: true }).click();
    await expect(sheet.getByRole("alert")).toContainText("whole number of sets");
    await expect(sheet.getByLabel("Sets", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await sheet.getByRole("button", { name: "Dismiss error notification" }).click();
    await choose("Plank");
    await expect(sheet.getByLabel("Duration (mins)")).toBeVisible();
    await expect(sheet.getByLabel("Distance (km)")).toHaveCount(0);
    await choose("Running");
    await expect(sheet.getByLabel("Duration (mins)")).toBeVisible();
    await expect(sheet.getByLabel("Distance (km)")).toBeVisible();
    await sheet.getByLabel("Distance (km)").pressSequentially("2.5");
    await expect(sheet.getByLabel("Distance (km)")).toHaveValue("2.5");
    await choose("Bench press");
    await expect(sheet.getByText("Last session:", { exact: false })).toContainText("3 sets · 8 reps · 25 kg");
    await expect(sheet.getByLabel("Sets", { exact: true })).toHaveValue("3");
    await expect(sheet.getByLabel("Reps", { exact: true })).toHaveValue("8");
    await expect(sheet.getByLabel("Weight (kg)")).toHaveValue("25");
    await sheet.getByRole("button", { name: "Add Exercise", exact: true }).click();
    await expect(page.getByRole("main").getByText("Bench press", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Edit exercises" }).click();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Edit selected exercise" }).click();
    const editSheet = page.getByRole("dialog", { name: "Edit Exercise" });
    await expect(editSheet.getByLabel("Weight (kg)")).toHaveValue("25");
    await editSheet.getByLabel("Weight (kg)").fill("30");
    await editSheet.getByRole("button", { name: "Save Exercise" }).click();
    await expect(page.getByRole("main").getByText("30 kg", { exact: true })).toBeVisible();
});

test("nested exercise creation is a page and returns to the unsaved routine", async ({ page }) => {
    await mockSignIn(page);
    await page.getByRole("link", { name: "Routines", exact: true }).click();
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page).toHaveURL(/\/routines\/new$/);
    await page.getByLabel("Name", { exact: true }).fill("My unfinished routine");
    await page.getByRole("button", { name: "Add exercise", exact: true }).click();
    await page.getByRole("combobox").click();
    await page.getByPlaceholder("Search exercise...").fill("Cable row");
    await page.getByText('Create "Cable row"').click();
    await expect(page).toHaveURL(/\/exercises\/new$/);
    await expect(page.getByRole("heading", { name: "Create Exercise" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Name", exact: true })).toHaveValue("Cable row");
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page).toHaveURL(/\/routines\/new$/);
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue("My unfinished routine");
});

test("saving a nested exercise selects it without losing the routine draft", async ({ page }) => {
    await mockSignIn(page);
    let saved: Record<string, unknown> | null = null;
    await page.route("**/rest/v1/**", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith("/rpc/save_exercise")) {
            saved = route.request().postDataJSON().p_exercise;
            return route.fulfill({ status: 200, contentType: "application/json", body: "null" });
        }
        const rows = url.pathname.endsWith("/exercises") && saved
            ? [{ id: saved.id, user_id: user.id, name: saved.name, metric_type: saved.metricType, image_link: "", note: "", archived: false, revision: 1 }]
            : [];
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(rows) });
    });
    await page.getByRole("link", { name: "Routines", exact: true }).click();
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByRole("textbox", { name: "Name", exact: true }).fill("Strength day");
    await page.getByRole("button", { name: "Add exercise", exact: true }).click();
    await page.getByRole("combobox").click();
    await page.getByPlaceholder("Search exercise...").fill("Cable row");
    await page.getByText('Create "Cable row"').click();
    await expect(page.getByRole("dialog", { name: "Add Exercise" })).not.toBeVisible();
    await page.getByRole("main").getByRole("button", { name: "Add Exercise", exact: true }).click();
    await expect(page).toHaveURL(/\/routines\/new$/);
    await expect(page.getByRole("combobox")).toContainText("Cable row");
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Name", exact: true })).toHaveValue("Strength day");
});

test("a delayed initial Auth event cannot clear an already loaded homepage", async ({ page }) => {
    await mockSignIn(page);
    await expect(page.getByRole("heading", { name: "Gym Logger", exact: true })).toBeVisible();
    // Model a server reconciliation which retains the same verified user. The
    // loader must not rely on a changed layout-data reference to restart itself.
    await page.route("**/__data.json**", (route) => route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ type: "data", nodes: [{ type: "skip" }, null] }),
    }));
    await page.evaluate(async () => {
        const modulePath = "/src/lib/supabase.ts";
        const { getSupabase } = await import(modulePath);
        // Simulate an initialization notification arriving after SIGNED_IN;
        // stored cookies and the server-verified user still refer to this user.
        await getSupabase().auth._notifyAllSubscribers("INITIAL_SESSION", null, false);
    });
    await expect(page.getByRole("heading", { name: "Gym Logger", exact: true })).toBeVisible();
    await expect(page.getByText("Loading your workouts…", { exact: true })).toHaveCount(0);
});

test("failed workout loading offers a retry instead of an endless spinner", async ({ page }) => {
    await mockSignIn(page, "failure");
    await expect(page.getByRole("alert")).toContainText("Test data service unavailable");
    await expect(page.getByRole("button", { name: "Retry loading", exact: true })).toBeVisible();
    await page.route("**/rest/v1/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await page.getByRole("button", { name: "Retry loading", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Gym Logger", exact: true })).toBeVisible();
});

test("a stalled read times out and can be retried without signing in again", async ({ page }) => {
    await page.clock.install();
    const readStarted = page.waitForRequest("**/rest/v1/sessions?**");
    await mockSignIn(page, "stalled");
    await readStarted;
    await expect(page.getByText("Loading your workouts…", { exact: true })).toBeVisible();
    await page.clock.fastForward(21_000);
    await expect(page.getByRole("alert")).toContainText("timed out");
    await page.route("**/rest/v1/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await page.getByRole("button", { name: "Retry loading", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Gym Logger", exact: true })).toBeVisible();
});

test("an actual sign-out still clears the account and returns to sign-in", async ({ page }) => {
    await mockSignIn(page);
    await expect(page.getByRole("heading", { name: "Gym Logger", exact: true })).toBeVisible();
    await page.route("**/__data.json**", (route) => route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ type: "data", nodes: [{ type: "data", data: [{ user: -1 }], uses: { dependencies: ["supabase:auth"] } }, null] }),
    }));
    await page.evaluate(async () => {
        const modulePath = "/src/lib/supabase.ts";
        const { getSupabase } = await import(modulePath);
        await getSupabase().auth.signOut({ scope: "local" });
    });
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByRole("heading", { name: "Welcome back.", exact: true })).toBeVisible();
    await expect(page.getByText("Total Sessions", { exact: true })).toHaveCount(0);
    const state = await page.evaluate(async () => {
        const modulePath = "/src/lib/cloud.svelte.ts";
        const { cloud } = await import(modulePath);
        return { owner: cloud.ownerId, ready: cloud.ready, exercises: cloud.data.exercises.length };
    });
    expect(state).toEqual({ owner: null, ready: false, exercises: 0 });
});
