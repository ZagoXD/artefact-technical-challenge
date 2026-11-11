"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { taskFields, type Task } from "@/lib/task";
import { trpc, errorMessage } from "@/lib/trpc";

export function TaskForm({ task }: { task?: Task }) {
  const router = useRouter();
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = taskFields.safeParse({ title, description });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError("");
    setPending(true);
    try {
      if (task) await trpc.tasks.update.mutate({ id: task.id, ...parsed.data });
      else await trpc.tasks.create.mutate(parsed.data);
      router.push(task ? "/?notice=updated" : "/?notice=created");
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel form">
      <fieldset disabled={pending}>
        <label htmlFor="title">
          Title <span className="muted">(required)</span>
        </label>
        <input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={120}
          autoFocus
          aria-describedby="title-help"
        />
        <p id="title-help" className="hint">
          A short, clear name. Up to 120 characters.
        </p>
        <label htmlFor="description">
          Description <span className="muted">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={6}
        />
        {error && (
          <p className="feedback error" role="alert">
            {error}
          </p>
        )}
        <div className="actions">
          <button type="submit" disabled={!title.trim()}>
            {pending ? "Saving…" : task ? "Save changes" : "Create task"}
          </button>
          <Link href="/" className="secondary">
            Cancel
          </Link>
        </div>
      </fieldset>
      {pending && <p role="status">Saving your task…</p>}
    </form>
  );
}
