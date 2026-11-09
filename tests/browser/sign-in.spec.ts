import { test, expect } from "@playwright/test";
import { env } from "node:process";

test.beforeEach(async ({ page }) => {
    page.on("pageerror", (error) => console.error("Browser error:", error.message));
});

test("signed-out users reach sign-in with a return destination", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/sessions");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fsessions/);
    await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
    await expect(page.getByRole("link", { name: "Exercises", exact: true })).toHaveCount(0);
    expect(errors).toEqual([]);
});

test("registration validates passwords without contacting hosted Auth", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByRole("button", { name: "Create an account", exact: true }).click();
    await page.getByLabel("Email address").fill("test@example.test");
    await page.getByLabel("Password", { exact: true }).fill("example-password-123");
    await page.getByLabel("Confirm password").fill("different-password-123");
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText("Your passwords do not match.");
});

test("invalid credentials show an error and do not navigate into the app", async ({ page }) => {
    await page.route("**/auth/v1/token?grant_type=password", (route) => route.fulfill({
        status: 400, contentType: "application/json", body: JSON.stringify({ code: "invalid_credentials", msg: "Invalid login credentials" }),
    }));
    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill("test@example.test");
    await page.getByLabel("Password", { exact: true }).fill("not-a-real-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Invalid login credentials");
    await expect(page).toHaveURL(/\/sign-in/);
});

test("reset shows a generic confirmation without sending real mail", async ({ page }) => {
    await page.route("**/auth/v1/recover**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
    await page.goto("/sign-in");
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await page.getByLabel("Email address").fill("test@example.test");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("status")).toContainText("If an account exists");
});

test("sign-in fits a mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("hosted account can sign in, load workouts, and sign out", async ({ page }) => {
    // Optional read-only smoke test. Supply a dedicated confirmed hosted test
    // account explicitly; never provision users or send mail automatically.
    const email = env.TEST_AUTH_EMAIL;
    const password = env.TEST_AUTH_PASSWORD;
    test.skip(!email || !password, "Requires a dedicated confirmed hosted test account");
    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(email!);
    await page.getByLabel("Password", { exact: true }).fill(password!);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Gym Logger", exact: true })).toBeVisible({ timeout: 20000 });
    await page.goto("/profile");
    await expect(page.getByText(email!, { exact: true })).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/sign-in/);
    await page.goto("/sessions");
    await expect(page).toHaveURL(/\/sign-in/);
});
