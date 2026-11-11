import { test } from "node:test";
import assert from "node:assert/strict";
import { appRouter } from "../src/server/router";
import { createStore } from "../src/server/store";

const caller = () => appRouter.createCaller({ store: createStore() });

test("CRUD trims fields, generates IDs and preserves creation time", async () => {
  const api = caller();
  assert.deepEqual((await api.tasks.list()).items, []);
  const task = await api.tasks.create({
    title: "  First task  ",
    description: "  Details  ",
  });
  assert.equal(task.title, "First task");
  assert.equal(task.description, "Details");
  assert.match(task.id, /^[0-9a-f-]{36}$/);
  assert.ok(task.createdAt > 0);
  assert.equal((await api.tasks.get({ id: task.id })).id, task.id);
  const updated = await api.tasks.update({ id: task.id, title: "Changed" });
  assert.equal(updated.createdAt, task.createdAt);
  assert.equal(updated.description, undefined);
  assert.equal((await api.tasks.list()).items[0].title, "Changed");
  await api.tasks.delete({ id: task.id });
  assert.equal((await api.tasks.list()).items.length, 0);
});

test("rejects blank, missing and oversized input, and invalid pagination", async () => {
  const api = caller();
  for (const title of ["", "   ", "x".repeat(121)]) {
    await assert.rejects(api.tasks.create({ title }), { code: "BAD_REQUEST" });
  }
  // Exercise runtime validation as an untyped external caller would.
  await assert.rejects(api.tasks.create({} as { title: string }), {
    code: "BAD_REQUEST",
  });
  await assert.rejects(
    api.tasks.create({ title: "Valid", description: "x".repeat(2001) }),
    { code: "BAD_REQUEST" },
  );
  const task = await api.tasks.create({ title: "Valid" });
  await assert.rejects(api.tasks.update({ id: task.id, title: " " }), {
    code: "BAD_REQUEST",
  });
  for (const input of [{ limit: 0 }, { limit: 51 }, { cursor: -1 }]) {
    await assert.rejects(api.tasks.list(input), { code: "BAD_REQUEST" });
  }
});

test("missing tasks return NOT_FOUND; malformed IDs return BAD_REQUEST", async () => {
  const api = caller();
  const id = crypto.randomUUID();
  await assert.rejects(api.tasks.get({ id }), { code: "NOT_FOUND" });
  await assert.rejects(api.tasks.update({ id, title: "Missing" }), {
    code: "NOT_FOUND",
  });
  await assert.rejects(api.tasks.delete({ id }), { code: "NOT_FOUND" });
  await assert.rejects(api.tasks.get({ id: "invalid" }), {
    code: "BAD_REQUEST",
  });
});

test("cursor pagination stays stable when a previous row is deleted", async () => {
  const api = caller();
  const tasks = [];
  for (let i = 0; i < 23; i++)
    tasks.push(await api.tasks.create({ title: `Task ${i}` }));
  const first = await api.tasks.list({ limit: 10 });
  assert.equal(first.items.length, 10);
  await api.tasks.delete({ id: first.items[0].id });
  const second = await api.tasks.list({ cursor: first.nextCursor!, limit: 10 });
  const third = await api.tasks.list({ cursor: second.nextCursor!, limit: 10 });
  assert.deepEqual(
    [...first.items, ...second.items, ...third.items].map((task) => task.id),
    tasks.map((task) => task.id),
  );
  assert.equal(third.nextCursor, null);
});
