import { test, expect } from "@playwright/test";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../src/server/router";

const api = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: "http://127.0.0.1:3100/api/trpc" })],
});

test.beforeEach(async () => {
  let page;
  do {
    page = await api.tasks.list.query({ limit: 50 });
    for (const task of page.items)
      await api.tasks.delete.mutate({ id: task.id });
  } while (page.nextCursor !== null);
});

test("create, edit, reload and delete with feedback", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("No tasks yet")).toBeVisible();
  await page.getByRole("link", { name: "New task", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Create task", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Title (required)").fill("  Prepare demo  ");
  await page
    .getByLabel("Description (optional)")
    .fill("Discuss the implementation.");
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Task created.");
  await expect(
    page.getByRole("heading", { name: "Prepare demo" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Edit Prepare demo", exact: true })
    .click();
  await expect(page.getByLabel("Title (required)")).toHaveValue("Prepare demo");
  await page.getByLabel("Title (required)").fill("Ship demo");
  await page.getByLabel("Description (optional)").fill("");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText("Task updated.");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Ship demo" })).toBeVisible();
  await page.getByRole("button", { name: "Delete Ship demo" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Task deleted." }),
  ).toBeVisible();
  await expect(page.getByText("No tasks yet")).toBeVisible();
});

test("renders tasks in server HTML with JavaScript disabled", async ({
  browser,
  request,
}) => {
  await api.tasks.create.mutate({
    title: "Server rendered task",
    description: "Visible before hydration.",
  });
  const response = await request.get("/");
  expect(await response.text()).toContain("Server rendered task");
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3100/");
  await expect(
    page.getByRole("heading", { name: "Server rendered task" }),
  ).toBeVisible();
  await context.close();
});

test("loads remaining pages on scroll without duplicates", async ({ page }) => {
  for (let i = 1; i <= 23; i++)
    await api.tasks.create.mutate({ title: `Task ${i}` });
  await page.goto("/");
  await expect(page.getByRole("listitem")).toHaveCount(10);
  for (let i = 0; i < 2; i++) {
    await page
      .getByRole("button", { name: "Load more tasks" })
      .scrollIntoViewIfNeeded();
    await expect(page.getByRole("listitem")).toHaveCount(i === 0 ? 20 : 23);
  }
  await expect(
    page.getByRole("button", { name: "Load more tasks" }),
  ).toHaveCount(0);
});

test("shows validation and not-found errors over HTTP", async ({ page }) => {
  await expect(api.tasks.create.mutate({ title: " " })).rejects.toThrow(
    "Title is required.",
  );
  await expect(
    api.tasks.update.mutate({ id: crypto.randomUUID(), title: "Missing" }),
  ).rejects.toThrow("Task not found.");
  await page.goto("/tasks/invalid/edit");
  await expect(
    page.getByRole("heading", { name: "Task not found" }),
  ).toBeVisible();
  await page.goto(`/tasks/${crypto.randomUUID()}/edit`);
  await expect(
    page.getByRole("heading", { name: "Task not found" }),
  ).toBeVisible();
});

test("keeps form input on network failure and allows retry", async ({
  page,
}) => {
  await page.goto("/tasks/new");
  await page.getByLabel("Title (required)").fill("Retry creation");
  await page.route("**/api/trpc/**", (route) => route.abort());
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Unable to reach the server.",
  );
  await expect(page.getByLabel("Title (required)")).toHaveValue(
    "Retry creation",
  );
  await page.unroute("**/api/trpc/**");
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Retry creation" }),
  ).toBeVisible();
});

test("reports failed deletion and retries successfully", async ({ page }) => {
  await api.tasks.create.mutate({ title: "Delete retry" });
  await page.goto("/");
  await page.route("**/api/trpc/**", (route) => route.abort());
  await page.getByRole("button", { name: "Delete Delete retry" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Unable to reach the server.",
  );
  await expect(
    page.getByRole("heading", { name: "Delete retry" }),
  ).toBeVisible();
  await page.unroute("**/api/trpc/**");
  await page.getByRole("button", { name: "Delete Delete retry" }).click();
  await expect(page.getByText("No tasks yet")).toBeVisible();
});

test("retries incremental loading after network failure", async ({ page }) => {
  for (let i = 1; i <= 11; i++)
    await api.tasks.create.mutate({ title: `Page task ${i}` });
  await page.goto("/");
  await page.route("**/api/trpc/**", (route) => route.abort());
  await page
    .getByRole("button", { name: "Load more tasks" })
    .scrollIntoViewIfNeeded();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Unable to reach the server.",
  );
  await expect(page.getByRole("listitem")).toHaveCount(10);
  await page.unroute("**/api/trpc/**");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("listitem")).toHaveCount(11);
});

test("supports a narrow mobile viewport without horizontal overflow", async ({
  page,
}) => {
  await api.tasks.create.mutate({
    title: "Plan the week",
    description: "Review priorities and prepare the next delivery.",
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Plan the week" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("surfaces a backend error when an open task is deleted elsewhere", async ({
  page,
}) => {
  const task = await api.tasks.create.mutate({ title: "Shared task" });
  await page.goto(`/tasks/${task.id}/edit`);
  await api.tasks.delete.mutate({ id: task.id });
  await page.getByLabel("Title (required)").fill("Updated task");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Task not found.",
  );
  await expect(page.getByLabel("Title (required)")).toHaveValue("Updated task");
});

test("offers manual pagination without IntersectionObserver", async ({
  page,
}) => {
  for (let i = 1; i <= 11; i++)
    await api.tasks.create.mutate({ title: `Manual task ${i}` });
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, "IntersectionObserver");
  });
  await page.goto("/");
  await expect(page.getByRole("listitem")).toHaveCount(10);
  await page.getByRole("button", { name: "Load more tasks" }).click();
  await expect(page.getByRole("listitem")).toHaveCount(11);
});
