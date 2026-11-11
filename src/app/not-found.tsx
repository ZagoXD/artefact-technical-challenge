import Link from "next/link";

export default function NotFound() {
  return <section className="panel empty"><h1>Task not found</h1><p className="muted">This task may have been deleted, or the address is incorrect.</p><Link href="/" className="button">Back to tasks</Link></section>;
}

