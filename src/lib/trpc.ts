"use client";

import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import type { AppRouter } from "@/server/router";

export const trpc = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: "/api/trpc" })],
});
export function errorMessage(error: unknown) {
  if (error instanceof TRPCClientError && !error.data) {
    return "Unable to reach the server. Check your connection and try again.";
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

