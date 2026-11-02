import type { SpawnSyncOptions } from 'node:child_process';
/** Injectable process boundary: callers need status/output, not OS bookkeeping. */
export type Spawn = (
  command: string,
  args: string[],
  options?: SpawnSyncOptions,
) => {
  status: number | null;
  stdout?: string | Buffer;
  stderr?: string | Buffer;
  error?: Error;
};
/** Network helpers deliberately accept small response doubles in offline tests. */
export type Fetch = (
  url: string | URL | Request,
  init?: RequestInit,
) => Promise<{
  status?: number;
  ok?: boolean;
  arrayBuffer?: () => Promise<ArrayBuffer>;
  json?: () => Promise<any>;
  body?: { cancel?: () => Promise<void> };
  headers?: { get?: (name: string) => string | null };
}>;
