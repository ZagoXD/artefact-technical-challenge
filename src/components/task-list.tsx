"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TaskPage } from "@/lib/task";
import { trpc, errorMessage } from "@/lib/trpc";

export function TaskList({ initialPage, notice = "" }: { initialPage: TaskPage; notice?: string }) {
  const [items, setItems] = useState(initialPage.items);
  const [cursor, setCursor] = useState(initialPage.nextCursor);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState(notice);
  const sentinel = useRef<HTMLDivElement>(null);
  const loadLock = useRef(false);

  const loadMore = useCallback(async () => {
    if (cursor === null || loadLock.current) return;
    loadLock.current = true;
    setLoading(true);
    setLoadError("");
    try {
      const page = await trpc.tasks.list.query({ cursor });
      setItems((current) => {
        const ids = new Set(current.map((task) => task.id));
        return [...current, ...page.items.filter((task) => !ids.has(task.id))];
      });
      setCursor(page.nextCursor);
    } catch (cause) {
      setLoadError(errorMessage(cause));
    } finally {
      setLoading(false);
      loadLock.current = false;
    }
  }, [cursor]);

  useEffect(() => {
    if (!sentinel.current || loadError || loading || cursor === null || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void loadMore();
    }, { rootMargin: "160px" });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [loadMore, loadError, loading, cursor]);

  async function remove(id: string) {
    setDeleting(id);
    setError("");
    setMessage("");
    try {
      await trpc.tasks.delete.mutate({ id });
      setItems((current) => current.filter((task) => task.id !== id));
      setMessage("Task deleted.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      {message && <p className="feedback success" role="status">{message}</p>}
      {error && <p className="feedback error" role="alert">{error}</p>}
      {items.length === 0 && cursor === null ? (
        <section className="panel empty">
          <h2>No tasks yet</h2>
          <p className="muted">Create your first task to get started.</p>
          <Link href="/tasks/new" className="button">Create a task</Link>
        </section>
      ) : (
        <ul className="task-list" aria-label="Tasks">
          {items.map((task) => (
            <li key={task.id} className="panel task">
              <div className="task-content">
                <h2><Link href={`/tasks/${task.id}/edit`}>{task.titulo}</Link></h2>
                {task.descricao && <p className="description">{task.descricao}</p>}
                <time dateTime={new Date(task.dataCriacao).toISOString()}>
                  Created {new Date(task.dataCriacao).toISOString().slice(0, 16).replace("T", " ")} UTC
                </time>
              </div>
              <div className="actions">
                <Link href={`/tasks/${task.id}/edit`} className="secondary" aria-label={`Edit ${task.titulo}`}>Edit</Link>
                <button className="danger" onClick={() => remove(task.id)} disabled={deleting !== null}
                  aria-label={`Delete ${task.titulo}`}>{deleting === task.id ? "Deleting…" : "Delete"}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {loadError && <p className="feedback error" role="alert">{loadError}</p>}
      {cursor !== null && (
        <div ref={sentinel} className="load-more">
          <button className="secondary" onClick={loadMore} disabled={loading}>{loading ? "Loading…" : loadError ? "Try again" : "Load more tasks"}</button>
          {loading && <span role="status" className="hint">Loading more tasks…</span>}
        </div>
      )}
    </>
  );
}

