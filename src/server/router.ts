import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { taskFields, taskId, type TaskPage } from "../lib/task";
import { store, type TaskStore } from "./store";

const t = initTRPC.context<{ store: TaskStore }>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      message:
        error.cause instanceof z.ZodError
          ? error.cause.issues[0].message
          : shape.message,
    };
  },
});
const pagination = z
  .object({
    cursor: z.number().int().nonnegative().default(0),
    limit: z.number().int().min(1).max(50).default(10),
  })
  .default({ cursor: 0, limit: 10 });

export const appRouter = t.router({
  tasks: t.router({
    list: t.procedure.input(pagination).query(({ ctx, input }): TaskPage => {
      const rows = [...ctx.store.tasks.values()]
        .filter((row) => row.sequence > input.cursor)
        .sort((a, b) => a.sequence - b.sequence)
        .slice(0, input.limit + 1);
      const page = rows.slice(0, input.limit);
      return {
        items: page.map((row) => row.task),
        nextCursor:
          rows.length > input.limit ? page[page.length - 1].sequence : null,
      };
    }),
    get: t.procedure.input(taskId).query(({ ctx, input }) => {
      const row = ctx.store.tasks.get(input.id);
      if (!row)
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
      return row.task;
    }),
    create: t.procedure.input(taskFields).mutation(({ ctx, input }) => {
      const task = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      ctx.store.tasks.set(task.id, { task, sequence: ++ctx.store.sequence });
      return task;
    }),
    update: t.procedure
      .input(taskFields.merge(taskId))
      .mutation(({ ctx, input }) => {
        const row = ctx.store.tasks.get(input.id);
        if (!row)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found.",
          });
        row.task = {
          ...row.task,
          title: input.title,
          description: input.description,
        };
        return row.task;
      }),
    delete: t.procedure.input(taskId).mutation(({ ctx, input }) => {
      if (!ctx.store.tasks.delete(input.id)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
      }
      return { id: input.id };
    }),
  }),
});
export type AppRouter = typeof appRouter;
export const createCaller = () => appRouter.createCaller({ store });
