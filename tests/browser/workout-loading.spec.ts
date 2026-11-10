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
    await page.getByRole('button', { name: 'Dumbbell', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Dumbbell', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const input = page.getByLabel('Upload a photo');
    await input.setInputFiles({ name: 'bad.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
    await expect(page.getByRole('alert')).toContainText('JPEG, PNG, or WebP');
    await input.setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('test image') });
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Dumbbell', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await page.getByRole('button', { name: 'Remove image' }).click();
    await expect(page.getByLabel('Selected exercise image')).toBeVisible();
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
