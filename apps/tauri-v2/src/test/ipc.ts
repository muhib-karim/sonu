import { mockIPC } from "@tauri-apps/api/mocks";

/** Arguments of one command call, exactly as the bindings passed them to `invoke`. */
export type IpcArgs = Record<string, unknown>;
export type IpcHandler = (args: IpcArgs) => unknown;

export interface IpcCall {
  cmd: string;
  args: IpcArgs;
}

/**
 * Fail a mocked command the way the Rust backend does.
 *
 * A Tauri command that returns `Err(String)` makes `invoke` reject with that
 * *string*, not with an `Error`. The generated bindings turn exactly that case
 * into `{ status: "error", error }` and resolve; anything that is an `Error`
 * (a transport or serialisation failure) is rethrown. Throwing a bare string
 * here is therefore deliberate: it reproduces the first case.
 */
export function backendError(message: string): never {
  throw message;
}

/**
 * Route `invoke` calls to per-command handlers through Tauri's own `mockIPC`.
 *
 * Use this together with `vi.unmock("@/bindings")` and
 * `vi.unmock("@tauri-apps/api/core")` so the test runs the real generated
 * commands and the real `invoke`; only the transport underneath is replaced.
 * A command without a handler fails loudly instead of resolving `undefined`.
 */
export function mockTauriCommands(handlers: Record<string, IpcHandler>) {
  const calls: IpcCall[] = [];

  mockIPC((cmd, payload) => {
    const args = (payload ?? {}) as IpcArgs;
    calls.push({ cmd, args });
    const handler = handlers[cmd];
    if (!handler) {
      throw new Error(`Unmocked Tauri command: ${cmd}`);
    }
    return handler(args);
  });

  return {
    /** Every call so far, in order. */
    calls,
    /** Calls to one command, in order. */
    callsTo: (cmd: string): IpcCall[] =>
      calls.filter((call) => call.cmd === cmd),
    /** Add or replace a handler after the mock is installed. */
    handle: (cmd: string, handler: IpcHandler): void => {
      handlers[cmd] = handler;
    },
  };
}

/** A promise whose settlement the test controls, for in-flight assertions. */
export function deferred<T = unknown>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
