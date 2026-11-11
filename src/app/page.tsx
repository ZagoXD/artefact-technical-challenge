import Link from "next/link";
import { TaskList } from "@/components/task-list";
import { createCaller } from "@/server/router";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const [initialPage, params] = await Promise.all([
    createCaller().tasks.list(),
    searchParams,
  ]);
  const notice =
    params.notice === "created"
      ? "Task created."
      : params.notice === "updated"
        ? "Task updated."
        : "";
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">TASK MANAGER</p>
          <h1>Your tasks</h1>
          <p className="muted">A little clarity for what comes next.</p>
        </div>
        <Link className="button" href="/tasks/new">
          New task
        </Link>
      </header>
      <TaskList
        key={JSON.stringify([initialPage, notice])}
        initialPage={initialPage}
        notice={notice}
      />
    </>
  );
}
