import { z } from "zod";

export const taskFields = z.object({
  titulo: z.string().trim().min(1, "Title is required.").max(120, "Use at most 120 characters."),
  descricao: z.string().trim().max(2000, "Use at most 2,000 characters.").optional(),
});
export const taskId = z.object({ id: z.string().uuid("Invalid task ID.") });
export type Task = z.infer<typeof taskFields> & { id: string; dataCriacao: number };
export type TaskPage = { items: Task[]; nextCursor: number | null };

