import { notFound } from "next/navigation";
import { TaskForm } from "@/components/task-form";
import { taskId } from "@/lib/task";
import { createCaller } from "@/server/router";
import { TRPCError } from "@trpc/server";

export const dynamic = "force-dynamic";
export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = taskId.safeParse(await params);
  if (!parsed.success) notFound();
  const task = await createCaller().tasks.get(parsed.data).catch((error: unknown) => {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    throw error;
  });
  return <><header className="page-header"><div><p className="eyebrow">TASK MANAGER</p><h1>Edit task</h1><p className="muted">Keep the details up to date.</p></div></header><TaskForm task={task} /></>;
}

