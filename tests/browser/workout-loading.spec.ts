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
        const headingBox = await heading.boundingBox();
        const backBox = await back.boundingBox();
        expect(headingBox && backBox && Math.abs((headingBox.y + headingBox.height / 2) - (backBox.y + backBox.height / 2))).toBeLessThan(2);
        await back.click();
        await page.getByRole("link", { name: "Routines", exact: true }).click();
        await page.getByRole("button", { name: "Add", exact: true }).click();
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
