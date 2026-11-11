"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="panel"><h1>Unable to load this page</h1><p role="alert">Something went wrong. Please try again.</p><button onClick={reset}>Try again</button></section>;
}

