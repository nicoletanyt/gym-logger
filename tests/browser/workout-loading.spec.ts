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

async function seedWorkoutCards(page: Page) {
    await page.evaluate(async () => {
        const modulePath = "/src/lib/cloud.svelte.ts";
        const { cloud } = await import(modulePath);
        cloud.data.exercises = [
            { id: "press", name: "Dumbbell press", metricType: "weight", imageLink: "/exercise-images/dumbbell.jpg" },
            { id: "plank", name: "Plank", metricType: "duration" },
            { id: "unused", name: "Unlogged exercise", metricType: "reps" },
        ];
        cloud.data.routines = [{ id: "strength", name: "Strength day", exercises: [] }];
        cloud.data.sessions = {
            first: { id: "first", revision: 1, date: "2026-11-10", duration: 1800, routineId: "strength", routineName: "Strength day", exercises: [
                { id: "press-entry", exerciseId: "press", metric: { type: "weight", sets: 3, reps: 10, weight: 20 } },
                { id: "plank-entry", exerciseId: "plank", metric: { type: "duration", sets: 2, duration: 1 } },
            ] },
            second: { id: "second", date: "2026-11-09", duration: 900, routineId: "custom", exercises: [
                { id: "earlier-entry", exerciseId: "press", metric: { type: "weight", sets: 2, reps: 8, weight: 15 } },
            ] },
        };
    });
}

test("routine cards keep names and metrics readable across sizes", async ({ page }) => {
    const errors = await mockSignIn(page);
    await seedWorkoutCards(page);
    await page.evaluate(async () => {
        const modulePath = "/src/lib/cloud.svelte.ts";
        const { cloud } = await import(modulePath);
        cloud.data.exercises.push({ id: "running", name: "Treadmill running with a gradual incline", metricType: "cardio" });
        cloud.data.routines = [
            { id: "strength", name: "Strength day", exercises: cloud.data.sessions.first.exercises },
            { id: "conditioning", name: "Full-body conditioning and endurance", exercises: [
                { id: "running-entry", exerciseId: "running", metric: { type: "cardio", sets: 2, duration: 15, distance: 2.5 } },
            ] },
        ];
    });
    await page.getByRole("link", { name: "Routines", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Routines", exact: true })).toBeVisible();
    for (const width of [320, 768, 1280]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({ colorScheme: width === 768 ? "dark" : "light" });
        const card = page.getByRole("link", { name: "Strength day", exact: true });
        await expect(card).toHaveAttribute("href", "/routines/strength");
        await expect(card.getByRole("heading", { name: "Strength day", exact: true })).toBeVisible();
        await expect(card.getByText("2 exercises", { exact: true })).toBeVisible();
        await expect(page.getByRole("link", { name: "Full-body conditioning and endurance", exact: true }).getByText("1 exercise", { exact: true })).toBeVisible();
        const entry = card.getByRole("listitem").first();
        const nameBox = await entry.getByText("Dumbbell press", { exact: true }).boundingBox();
        const metricBox = await entry.getByText("3 sets", { exact: true }).boundingBox();
        expect(metricBox!.y).toBeGreaterThanOrEqual(nameBox!.y + nameBox!.height);
        await expect(entry.getByText("10 reps", { exact: true })).toBeVisible();
        await expect(entry.getByText("20 kg", { exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: test.info().outputPath(`routines-${width}.png`), animations: "disabled" });
        await page.getByRole("button", { name: "Edit routines", exact: true }).click();
        const selectable = page.getByRole("button", { name: "Strength day", exact: true });
        await selectable.focus();
        await page.keyboard.press("Space");
        await expect(selectable).toHaveAttribute("aria-pressed", "true");
        await expect(page.getByRole("checkbox", { name: "Select Strength day", exact: true })).toBeChecked();
        await expect(selectable.locator("..")).toHaveClass(/ring-primary/);
        await expect(page).toHaveURL(/\/routines$/);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: test.info().outputPath(`routines-selected-${width}.png`), animations: "disabled" });
        await page.keyboard.press("Enter");
        await expect(selectable).toHaveAttribute("aria-pressed", "false");
        await page.getByRole("checkbox", { name: "Select Strength day", exact: true }).check();
        await expect(selectable).toHaveAttribute("aria-pressed", "true");
        await page.getByRole("button", { name: "Select All", exact: true }).click();
        await expect(page.getByRole("checkbox", { name: "Select Full-body conditioning and endurance", exact: true })).toBeChecked();
        await page.getByRole("button", { name: "Deselect All", exact: true }).click();
        await expect(page.getByRole("checkbox", { name: "Select Strength day", exact: true })).not.toBeChecked();
        await page.getByRole("button", { name: "Edit routines", exact: true }).click();
    }
    await page.getByRole("link", { name: "Strength day", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Strength day", exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/routines\/strength$/);
    for (const width of [320, 1280]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.screenshot({ path: test.info().outputPath(`routine-detail-reference-${width}.png`), animations: "disabled" });
    }
    expect(errors).toEqual([]);
});

test("routine cards handle empty routines, missing exercises and unbroken names", async ({ page }) => {
    await mockSignIn(page);
    await page.setViewportSize({ width: 320, height: 1000 });
    await page.evaluate(async () => {
        const modulePath = "/src/lib/cloud.svelte.ts";
        const { cloud } = await import(modulePath);
        cloud.data.routines = [
            { id: "empty", name: "RoutineWithAnUnusuallyLongUnbrokenName", exercises: [] },
            { id: "missing", name: "Previous routine", exercises: [
                { id: "missing-entry", exerciseId: "missing", metric: { type: "weight", sets: 3, reps: 10, weight: 20 } },
            ] },
        ];
    });
    await page.getByRole("link", { name: "Routines", exact: true }).click();
    const empty = page.getByRole("link", { name: "RoutineWithAnUnusuallyLongUnbrokenName", exact: true });
    await expect(empty.getByText("0 exercises", { exact: true })).toBeVisible();
    await expect(empty.getByRole("list")).toHaveCount(0);
    await expect(empty.locator('[data-slot="library-card-body"]')).toHaveCount(0);
    const missing = page.getByRole("link", { name: "Previous routine", exact: true });
    await expect(missing.getByText("Unknown exercise", { exact: true })).toBeVisible();
    await expect(missing.getByText("20 kg", { exact: true })).toBeVisible();
    expect(await page.getByRole("main").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("routine-edge-cases.png"), animations: "disabled" });
});

test("library cards share metadata and exercise previews with a four-item limit", async ({ page }) => {
    const errors = await mockSignIn(page);
    await page.evaluate(async () => {
        const modulePath = "/src/lib/cloud.svelte.ts";
        const { cloud } = await import(modulePath);
        cloud.data.exercises = Array.from({ length: 6 }, (_, index) => ({
            id: `exercise-${index + 1}`, name: `Exercise ${index + 1}`, metricType: "reps",
        }));
        cloud.data.routines = [{ id: "full", name: "Full routine", exercises: cloud.data.exercises.map((exercise: { id: string }, index: number) => ({
            id: `entry-${index}`, exerciseId: exercise.id, metric: { type: "reps", sets: 3, reps: 10 },
        })) }];
        cloud.data.sessions = { full: { id: "full", date: "2026-11-10", duration: 1800, routineId: "full", exercises: cloud.data.routines[0].exercises } };
    });
    async function styles(card: ReturnType<Page["getByRole"]>) {
        return card.evaluate((element) => {
            const content = getComputedStyle(element);
            const surface = getComputedStyle(element.parentElement!);
            const title = getComputedStyle(element.querySelector("h2")!);
            return {
                padding: content.padding, radius: content.borderRadius,
                background: surface.backgroundColor, shadow: surface.boxShadow,
                fontSize: title.fontSize, fontWeight: title.fontWeight, lineHeight: title.lineHeight,
            };
        });
    }
    async function metaStyles(card: ReturnType<Page["getByRole"]>) {
        return card.locator('[data-slot="workout-card-meta"]').evaluate((element) => {
            const meta = getComputedStyle(element);
            const icon = getComputedStyle(element.querySelector("svg")!);
            return { fontSize: meta.fontSize, fontWeight: meta.fontWeight, color: meta.color, gap: meta.gap, iconWidth: icon.width, iconHeight: icon.height };
        });
    }
    async function entryStyles(entry: ReturnType<Page["getByRole"]>) {
        return entry.evaluate((element) => {
            const row = getComputedStyle(element);
            const name = getComputedStyle(element.querySelector("p")!);
            return { gap: row.gap, alignItems: row.alignItems, fontSize: name.fontSize, fontWeight: name.fontWeight, lineHeight: name.lineHeight };
        });
    }
    async function headerStyle(card: ReturnType<Page["getByRole"]>) {
        return card.evaluate((element) => {
            const header = element.querySelector('[data-slot="library-card-header"]')!;
            const background = getComputedStyle(header).backgroundColor;
            const bodyBackground = getComputedStyle(element.parentElement!).backgroundColor;
            function luminance(color: string) {
                const canvas = document.createElement("canvas");
                canvas.width = canvas.height = 1;
                const context = canvas.getContext("2d")!;
                context.fillStyle = color;
                context.fillRect(0, 0, 1, 1);
                const components = Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3).map((value) => value / 255);
                const [r, g, b] = components.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
                return 0.2126 * r + 0.7152 * g + 0.0722 * b;
            }
            const headerLuminance = luminance(background);
            function contrast(selector: string) {
                const textLuminance = luminance(getComputedStyle(header.querySelector(selector)!).color);
                return (Math.max(textLuminance, headerLuminance) + 0.05) / (Math.min(textLuminance, headerLuminance) + 0.05);
            }
            return { background, headerLuminance, bodyLuminance: luminance(bodyBackground), titleContrast: contrast("h2"), metaContrast: contrast('[data-slot="workout-card-meta"]') };
        });
    }
    let previewEntryStyle: Awaited<ReturnType<typeof entryStyles>> | undefined;
    let headerBackground: string | undefined;
    for (const width of [320, 768, 1280]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({ colorScheme: width === 768 ? "dark" : "light" });
        await page.getByRole("link", { name: "Routines", exact: true }).click();
        const routine = page.getByRole("link", { name: "Full routine", exact: true });
        await expect(routine.getByRole("listitem")).toHaveCount(4);
        await expect(routine.getByText("6 exercises", { exact: true })).toBeVisible();
        await expect(routine.getByText("+2 more exercises", { exact: true })).toBeVisible();
        await expect(routine.getByText("Exercise 5", { exact: true })).toHaveCount(0);
        const routineStyle = await styles(routine);
        const routineMetaStyle = await metaStyles(routine);
        const routineHeaderStyle = await headerStyle(routine);
        if (width === 768) expect(routineHeaderStyle.headerLuminance).toBeGreaterThan(routineHeaderStyle.bodyLuminance);
        else expect(routineHeaderStyle.headerLuminance).toBeLessThan(routineHeaderStyle.bodyLuminance);
        headerBackground ??= routineHeaderStyle.background;
        expect(routineHeaderStyle.background).toBe(headerBackground);
        expect(routineHeaderStyle.titleContrast).toBeGreaterThanOrEqual(4.5);
        expect(routineHeaderStyle.metaContrast).toBeGreaterThanOrEqual(4.5);
        const firstRoutineItem = await routine.getByRole("listitem").first().textContent();
        previewEntryStyle = await entryStyles(routine.locator('[data-slot="exercise-entry-content"]').first());
        await expect(routine.locator('[data-slot="workout-card-meta"] svg')).toHaveCount(1);
        await page.screenshot({ path: test.info().outputPath(`routine-preview-${width}.png`), animations: "disabled" });
        await page.getByRole("link", { name: "Sessions", exact: true }).click();
        const session = page.getByRole("link", { name: "2026-11-10", exact: true });
        await expect(session.getByRole("listitem")).toHaveCount(4);
        await expect(session.getByText("6 exercises", { exact: true })).toBeVisible();
        await expect(session.getByText("30m", { exact: true })).toBeVisible();
        await expect(session.getByText("+2 more exercises", { exact: true })).toBeVisible();
        await expect(session.getByText("3 sets", { exact: true })).toHaveCount(4);
        await expect(session.getByRole("listitem").first().locator("svg")).toHaveCount(3);
        await expect(session.getByRole("listitem").first()).toHaveText(firstRoutineItem!);
        expect(await styles(session)).toEqual(routineStyle);
        expect(await metaStyles(session)).toEqual(routineMetaStyle);
        expect(await headerStyle(session)).toEqual(routineHeaderStyle);
        expect(await entryStyles(session.locator('[data-slot="exercise-entry-content"]').first())).toEqual(previewEntryStyle);
        const titleBox = await session.getByRole("heading").boundingBox();
        const metaBox = await session.locator('[data-slot="workout-card-meta"]').boundingBox();
        expect(metaBox!.y).toBeGreaterThanOrEqual(titleBox!.y + titleBox!.height);
        const countBox = await session.getByText("6 exercises", { exact: true }).boundingBox();
        const durationBox = await session.getByText("30m", { exact: true }).boundingBox();
        expect(durationBox!.x).toBeGreaterThan(countBox!.x + countBox!.width);
        expect(Math.abs(durationBox!.y - countBox!.y)).toBeLessThan(2);
        expect(await page.getByRole("main").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
        await page.screenshot({ path: test.info().outputPath(`session-preview-${width}.png`), animations: "disabled" });
        await page.getByRole("link", { name: "Exercises", exact: true }).click();
        const exercise = page.getByRole("link", { name: "Exercise 1", exact: true });
        await expect(exercise).toBeVisible();
        expect(await styles(exercise)).toEqual(routineStyle);
        await expect(page.locator('main [data-slot="card"]')).toHaveCount(6);
        await page.screenshot({ path: test.info().outputPath(`exercise-library-${width}.png`), animations: "disabled" });
        await page.getByRole("button", { name: "Edit exercises", exact: true }).click();
        const selected = page.getByRole("button", { name: "Exercise 1", exact: true });
        await selected.focus();
        await page.keyboard.press("Space");
        await expect(selected).toHaveAttribute("aria-pressed", "true");
        await expect(selected.locator("..")).toHaveClass(/ring-primary/);
        await expect(page.getByRole("checkbox", { name: "Select Exercise 1", exact: true })).toBeChecked();
        await page.keyboard.press("Enter");
        await expect(selected).toHaveAttribute("aria-pressed", "false");
        await page.getByRole("button", { name: "Edit exercises", exact: true }).click();
        expect(await page.getByRole("main").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    }
    await page.getByRole("link", { name: "Routines", exact: true }).click();
    await page.getByRole("link", { name: "Full routine", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Full routine", exact: true })).toBeVisible();
    await expect(page.locator('main [data-slot="card"]')).toHaveCount(6);
    await expect(page.getByText("Exercise 6", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Exercises", exact: true }).getByText("6 exercises", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Exercise 1", exact: true })).toContainText("3 sets");
    await page.getByRole("link", { name: "Sessions", exact: true }).click();
    await page.getByRole("link", { name: "2026-11-10", exact: true }).click();
    await expect(page.getByRole("heading", { name: "2026-11-10", exact: true })).toBeVisible();
    await expect(page.locator('main [data-slot="card"]')).toHaveCount(6);
    await expect(page.getByRole("region", { name: "Exercises", exact: true }).getByText("6 exercises", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Sessions", exact: true }).click();
    await page.evaluate(async () => {
        const modulePath = "/src/lib/cloud.svelte.ts";
        const { cloud } = await import(modulePath);
        cloud.data.sessions.full.duration = 0;
    });
    await expect(page.getByRole("link", { name: "2026-11-10", exact: true }).getByText("0s", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Routines", exact: true }).click();
    for (const count of [5, 4, 3]) {
        await page.evaluate(async (count) => {
            const modulePath = "/src/lib/cloud.svelte.ts";
            const { cloud } = await import(modulePath);
            cloud.data.routines[0].exercises = cloud.data.routines[0].exercises.slice(0, count);
        }, count);
        const routine = page.getByRole("link", { name: "Full routine", exact: true });
        await expect(routine.getByRole("listitem")).toHaveCount(Math.min(count, 4));
        await expect(routine.getByText(`${count} exercises`, { exact: true })).toBeVisible();
        if (count === 5) await expect(routine.getByText("+1 more exercise", { exact: true })).toBeVisible();
        else await expect(routine.getByText(/more exercise/)).toHaveCount(0);
    }
    expect(errors).toEqual([]);
});

test("routine and session details share exercise cards and live list counts", async ({ page }) => {
    const errors = await mockSignIn(page);
    await seedWorkoutCards(page);
    await page.evaluate(async () => {
        const modulePath = "/src/lib/cloud.svelte.ts";
        const { cloud } = await import(modulePath);
        cloud.data.routines[0].exercises = cloud.data.sessions.first.exercises;
    });
    async function cardStyle() {
        return page.getByRole("region", { name: "Exercises", exact: true }).locator('[data-slot="card"]').first().evaluate((element) => {
            const surface = getComputedStyle(element);
            const header = getComputedStyle(element.querySelector('[data-slot="library-card-header"]')!);
            const title = getComputedStyle(element.querySelector("h2")!);
            const image = element.querySelector("img")!.getBoundingClientRect();
            return { radius: surface.borderRadius, background: surface.backgroundColor, shadow: surface.boxShadow, padding: header.padding, fontSize: title.fontSize, fontWeight: title.fontWeight, imageWidth: image.width, imageHeight: image.height };
        });
    }
    for (const width of [320, 768, 1280]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({ colorScheme: width === 768 ? "dark" : "light" });
        await page.getByRole("link", { name: "Routines", exact: true }).click();
        await page.getByRole("link", { name: "Strength day", exact: true }).click();
        const region = page.getByRole("region", { name: "Exercises", exact: true });
        await expect(region.getByText("2 exercises", { exact: true })).toBeVisible();
        await expect(region.locator('[data-slot="card"]')).toHaveCount(2);
        await expect(region.locator('img[src="/exercise-images/dumbbell.jpg"]')).toBeVisible();
        await expect(region.getByRole("link", { name: "Dumbbell press", exact: true })).toContainText("20 kg");
        const routineStyle = await cardStyle();
        const countBox = await region.getByText("2 exercises", { exact: true }).boundingBox();
        const cardBox = await region.locator('[data-slot="card"]').first().boundingBox();
        expect(countBox!.y + countBox!.height).toBeLessThan(cardBox!.y);
        expect(await page.getByRole("main").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
        await page.screenshot({ path: test.info().outputPath(`routine-detail-${width}.png`), animations: "disabled" });
        await page.getByRole("link", { name: "Sessions", exact: true }).click();
        await page.getByRole("link", { name: "2026-11-10", exact: true }).click();
        await expect(region.getByText("2 exercises", { exact: true })).toBeVisible();
        await expect(region.locator('[data-slot="card"]')).toHaveCount(2);
        expect(await cardStyle()).toEqual(routineStyle);
        expect(await page.getByRole("main").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
        await page.screenshot({ path: test.info().outputPath(`session-detail-${width}.png`), animations: "disabled" });
    }
    for (const kind of ["routine", "session"] as const) {
        await page.getByRole("link", { name: kind === "routine" ? "Routines" : "Sessions", exact: true }).click();
        await page.getByRole("link", { name: kind === "routine" ? "Strength day" : "2026-11-10", exact: true }).click();
        await page.getByRole("button", { name: `Edit ${kind}`, exact: true }).click();
        const region = page.getByRole("region", { name: "Exercises", exact: true });
        await region.getByRole("button", { name: "Edit exercises", exact: true }).click();
        for (const [name, count] of [["Dumbbell press", "1 exercise"], ["Plank", "0 exercises"]]) {
            await region.getByRole("checkbox", { name: `Select ${name}`, exact: true }).check();
            await region.getByRole("button", { name: "Remove selected exercises", exact: true }).click();
            await expect(region.locator('[aria-live="polite"]')).toHaveText(count);
        }
        await expect(region.locator('[data-slot="card"]')).toHaveCount(0);
    }
    expect(errors).toEqual([]);
});

test("workout cards and detail layouts", async ({ page }) => {
    const errors = await mockSignIn(page);
    await seedWorkoutCards(page);
    for (const width of [320, 768, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme: width === 768 ? "dark" : "light" });
        await page.getByRole("link", { name: "Exercises", exact: true }).click();
        await expect(page.getByRole("heading", { name: "Exercises", exact: true })).toBeVisible();
        const unlogged = page.getByRole("link", { name: "Unlogged exercise", exact: true });
        await expect(unlogged.locator('[data-slot="card-content"]')).toHaveText("Unlogged exercise");
        await expect(page.getByRole("main").getByText("Weight", { exact: true })).toHaveCount(0);
        await expect(page.getByRole("main").getByText("Duration", { exact: true })).toHaveCount(0);
        await page.screenshot({ path: test.info().outputPath(`exercises-${width}.png`), animations: "disabled" });
        await unlogged.click();
        await expect(page.getByRole("heading", { name: "Unlogged exercise", exact: true })).toBeVisible();
        await expect(page.getByRole("main").getByRole("img")).toHaveCount(0);
        await page.screenshot({ path: test.info().outputPath(`exercise-detail-${width}.png`), animations: "disabled" });
        await page.getByRole("link", { name: "Sessions", exact: true }).click();
        await expect(page.getByRole("heading", { name: "Sessions", exact: true })).toBeVisible();
        const cards = page.locator('main [data-slot="card"]');
        await expect(cards).toHaveCount(2);
        const first = await cards.nth(0).boundingBox();
        const second = await cards.nth(1).boundingBox();
        expect(Math.abs(first!.x - second!.x)).toBeLessThan(2);
        expect(second!.y).toBeGreaterThan(first!.y + first!.height);
        expect(Math.abs(first!.width - second!.width)).toBeLessThan(2);
        await expect(cards.nth(0).locator('[data-slot="library-card-header"] svg[aria-hidden="true"]')).toHaveCount(4);
        await expect(cards.nth(0).getByText("2 exercises", { exact: true })).toBeVisible();
        await expect(cards.nth(1).getByText("1 exercise", { exact: true })).toBeVisible();
        await expect(cards.nth(0)).toContainText("20 kg");
        await page.screenshot({ path: test.info().outputPath(`sessions-${width}.png`), animations: "disabled" });
        await page.getByText("2026-11-10", { exact: true }).click();
        await expect(page.getByRole("heading", { name: "2026-11-10", exact: true })).toBeVisible();
        await expect(page.getByLabel("Duration (mins)", { exact: true })).toHaveValue("30");
        await expect(page.getByLabel("Duration (mins)", { exact: true })).toHaveAttribute("readonly", "");
        await expect(page.getByRole("combobox", { name: "Routine" })).toBeDisabled();
        await expect(page.getByRole("combobox", { name: "Routine" })).toContainText("Strength day");
        await expect(page.getByRole("main").locator('img[src="/exercise-images/dumbbell.jpg"]')).toBeVisible();
        await expect(page.getByRole("link", { name: "Dumbbell press", exact: true })).toContainText("20 kg");
        await page.screenshot({ path: test.info().outputPath(`session-detail-${width}.png`), animations: "disabled" });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.getByRole("link", { name: "Sessions", exact: true }).click();
    await page.getByRole("heading", { name: "Sessions", exact: true }).waitFor();
    await page.getByRole("link", { name: "2026-11-09", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "2026-11-09", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dumbbell press", exact: true })).toContainText("15 kg");
    expect(errors).toEqual([]);
});

test("empty exercise and session pages offer inline creation actions", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await mockSignIn(page);
    await page.getByRole("link", { name: "Sessions", exact: true }).click();
    await expect(page.getByText("No Sessions Created", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Log Session", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Log Session", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Exercises", exact: true }).click();
    await expect(page.getByText("No Exercises Added", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Add Exercise", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Create Exercise", exact: true })).toBeVisible();
});

test("exercise name and session date searches filter and reset", async ({ page }) => {
    await mockSignIn(page);
    await seedWorkoutCards(page);
    await page.getByRole("link", { name: "Exercises", exact: true }).click();
    const search = page.getByRole("searchbox", { name: "Search exercises" });
    await search.fill("  PRESS  ");
    await expect(page.locator('main [data-slot="card"]')).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Dumbbell press", exact: true })).toBeVisible();
    await search.fill("no match");
    await expect(page.getByRole("status")).toHaveText("No exercises match your search.");
    await page.getByRole("button", { name: "Clear search", exact: true }).click();
    await expect(search).toHaveValue("");
    await expect(page.locator('main [data-slot="card"]')).toHaveCount(3);
    await page.getByRole("link", { name: "Sessions", exact: true }).click();
    const date = page.getByLabel("Search sessions by date", { exact: true });
    await date.fill("2026-11-09");
    await expect(page.locator('main [data-slot="card"]')).toHaveCount(1);
    await expect(page.locator('main [data-slot="card"]')).toContainText("2026-11-09");
    await page.getByRole("button", { name: "Filter sessions" }).click();
    await page.getByRole("button", { name: "Sort by duration", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(page.locator('main [data-slot="card"]')).toHaveCount(1);
    await date.fill("2026-11-01");
    await expect(page.getByRole("status")).toHaveText("No sessions on this date.");
    await page.getByRole("button", { name: "Clear date search", exact: true }).click();
    await expect(date).toHaveValue("");
    await expect(page.locator('main [data-slot="card"]')).toHaveCount(2);
});

test("session detail editing keeps recorded exercises when changing routine", async ({ page }) => {
    await mockSignIn(page);
    await seedWorkoutCards(page);
    await page.getByRole("link", { name: "Sessions", exact: true }).click();
    await page.getByRole("heading", { name: "Sessions", exact: true }).waitFor();
    await page.getByText("2026-11-10", { exact: true }).click();
    await page.getByRole("button", { name: "Edit session", exact: true }).click();
    const duration = page.getByLabel("Duration (mins)", { exact: true });
    await expect(duration).not.toHaveAttribute("readonly");
    await duration.fill("45.5");
    await page.getByRole("combobox", { name: "Routine" }).click();
    await page.getByRole("option", { name: "Custom", exact: true }).click();
    await expect(page.getByRole("main").getByText("Dumbbell press", { exact: true }).locator("..")).toContainText("20 kg");
    await expect(page.getByRole("main").getByText("Plank", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Edit exercises", exact: true }).click();
    await page.getByRole("checkbox", { name: "Select Dumbbell press" }).check();
    await page.getByRole("button", { name: "Edit selected exercise", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Edit Exercise" }).getByLabel("Weight (kg)")).toHaveValue("20");
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.route("**/rest/v1/rpc/save_session", async (route) => {
        await route.fulfill({ status: 200, contentType: "application/json", body: "null" });
    });
    await page.route("**/rest/v1/sessions?**", (route) => route.fulfill({
        status: 200, contentType: "application/json", body: JSON.stringify([{
            id: "first", workout_date: "2026-11-10", duration_seconds: 2730, routine_id: null, revision: 2, created_at: "2026-11-10T12:00:00Z",
            session_exercises: [
                { id: "press-entry", exercise_id: "press", position: 0, metric_type: "weight", sets: 3, reps: 10, weight_kg: 20, exercise_name_snapshot: "Dumbbell press" },
                { id: "plank-entry", exercise_id: "plank", position: 1, metric_type: "duration", sets: 2, duration_minutes: 1, exercise_name_snapshot: "Plank" },
            ],
        }]),
    }));
    const saved = page.waitForRequest("**/rest/v1/rpc/save_session");
    await page.getByRole("button", { name: "Save session", exact: true }).click();
    expect((await saved).postDataJSON()).toMatchObject({ p_expected_revision: 1, p_session: { duration: 2730, routineId: "custom", exercises: [{ exerciseId: "press" }, { exerciseId: "plank" }] } });
    await expect(page.getByRole("button", { name: "Edit session", exact: true })).toBeVisible();
    await expect(duration).toHaveValue("45.5");
    await expect(duration).toHaveAttribute("readonly", "");
    await expect(page.getByRole("combobox", { name: "Routine" })).toContainText("Custom");
    await expect(page.getByRole("main").getByText("Dumbbell press", { exact: true }).locator("..")).toContainText("20 kg");
});

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

test("live sessions retain per-set labels, full metrics, safe averages and filled effort stars", async ({ page }) => {
    const errors = await mockSignIn(page);
    await page.getByRole("link", { name: "Start Session" }).click();
    await expect(page.getByRole("heading", { name: "New Session" })).toBeVisible();
    await page.evaluate(async () => {
        const cloudPath = "/src/lib/cloud.svelte.ts";
        const sessionPath = "/src/lib/Session.svelte.ts";
        const { cloud } = await import(cloudPath);
        const { sessionManager } = await import(sessionPath);
        cloud.data.exercises = [
            { id: "press", name: "Dumbbell press", metricType: "weight" },
            { id: "run", name: "Run", metricType: "cardio" },
            { id: "plank", name: "Plank", metricType: "duration" },
            { id: "crunch", name: "Crunch", metricType: "reps" },
        ];
        sessionManager.activeSession.exercises = [
            { id: "press-entry", exerciseId: "press", metric: { type: "weight", sets: 3, weight: 20, reps: 10 } },
            { id: "run-entry", exerciseId: "run", metric: { type: "cardio", sets: 1, duration: 15, distance: 2 } },
            { id: "plank-entry", exerciseId: "plank", metric: { type: "duration", sets: 1, duration: 2 } },
            { id: "crunch-entry", exerciseId: "crunch", metric: { type: "reps", sets: 1, reps: 12 } },
        ];
    });
    await page.clock.install({ time: new Date("2026-11-10T12:00:00Z") });
    await page.clock.pauseAt(new Date("2026-11-10T12:00:01Z"));
    await page.getByRole("button", { name: "Start Session", exact: true }).click();
    const press = page.getByText("Dumbbell press", { exact: true }).locator("..");
    const run = page.getByText("Run", { exact: true }).locator("..");
    await expect(press.getByText(/^20\s*kg$/)).toBeVisible();
    await expect(press.getByText(/^10\s*reps$/)).toBeVisible();
    await expect(run.getByText(/^15\s*mins$/)).toBeVisible();
    await expect(run.getByText(/^2\s*km$/)).toBeVisible();
    await expect(page.getByText("Plank", { exact: true }).locator("..").getByText(/^2\s*mins$/)).toBeVisible();
    await expect(page.getByText("Crunch", { exact: true }).locator("..").getByText(/^12\s*reps$/)).toBeVisible();
    await page.clock.fastForward(4_000);
    await press.locator("label").filter({ hasText: /^Set 1$/ }).click();
    await expect(press.getByRole("checkbox")).toHaveCount(2);
    await page.clock.fastForward(6_000);
    await press.locator("label").filter({ hasText: /^Set 2$/ }).click();
    await expect(press.getByRole("checkbox")).toHaveCount(3);
    const ids = await page.getByRole("checkbox").evaluateAll((elements) => elements.map((element) => element.id));
    expect(new Set(ids).size).toBe(ids.length);
    await expect(press.getByRole("checkbox").nth(0)).toBeChecked();
    await expect(press.getByRole("checkbox").nth(1)).toBeChecked();
    await expect(press.getByRole("checkbox").nth(2)).not.toBeChecked();
    for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.screenshot({ path: test.info().outputPath(`live-session-${width}.png`), animations: "disabled" });
    }
    await page.clock.resume();
    await page.getByRole("button", { name: "End Session", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Session Complete!" })).toBeVisible();
    const averages = await page.evaluate(async () => {
        const modulePath = "/src/lib/Session.svelte.ts";
        const { sessionManager } = await import(modulePath);
        return sessionManager.activeSession.exercises.map((entry: { avgDuration?: number }) => entry.avgDuration);
    });
    expect(averages).toEqual([5, 0, 0, 0]);
    await expect(page.getByRole("button", { name: "Add exercise", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Edit exercises", exact: true })).toHaveCount(0);
    const stars = page.getByText("Rate your level of effort", { exact: true }).locator("..").getByRole("button");
    await stars.nth(2).click();
    for (let i = 0; i < 5; i++) {
        await expect(stars.nth(i).locator("svg")).toHaveAttribute("fill", i < 3 ? "currentColor" : "none");
    }
    await page.screenshot({ path: test.info().outputPath("session-summary.png"), animations: "disabled" });
    expect(errors).toEqual([]);
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
