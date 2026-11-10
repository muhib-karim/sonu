import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { listen } from "@tauri-apps/api/event";
import { commands, type ModelInfo } from "@/bindings";
import { useCurrentModel } from "../useCurrentModel";

// The shared mock in src/test/setup.ts does not include the model commands,
// so this file supplies its own.
vi.mock("@/bindings", () => ({
  commands: {
    getAvailableModels: vi.fn(),
    getCurrentModel: vi.fn(),
  },
}));

const model = (id: string) => ({ id, name: id }) as unknown as ModelInfo;

const ok = <T>(data: T) => ({ status: "ok" as const, data });
const err = (error: string) => ({ status: "error" as const, error });

describe("useCurrentModel", () => {
  let unlisten: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    unlisten = vi.fn<() => void>();
    vi.mocked(listen).mockResolvedValue(unlisten);
    vi.mocked(commands.getAvailableModels).mockResolvedValue(
      ok([model("parakeet-v3"), model("whisper-small")]),
    );
    vi.mocked(commands.getCurrentModel).mockResolvedValue(ok("parakeet-v3"));
  });

  it("loads the model list and the current selection on mount", async () => {
    const { result } = renderHook(() => useCurrentModel());

    await waitFor(() =>
      expect(result.current.currentModel).toBe("parakeet-v3"),
    );

    expect(result.current.models.map((m) => m.id)).toEqual([
      "parakeet-v3",
      "whisper-small",
    ]);
  });

  it("keeps its previous state when the backend returns errors", async () => {
    vi.mocked(commands.getAvailableModels).mockResolvedValue(
      err("model directory unreadable"),
    );
    vi.mocked(commands.getCurrentModel).mockResolvedValue(err("no model"));

    const { result } = renderHook(() => useCurrentModel());
    await act(async () => {
      await result.current.loadCurrentModel();
    });

    expect(result.current.models).toEqual([]);
    expect(result.current.currentModel).toBe("");
  });

  it("applies whichever half of the load succeeded", async () => {
    vi.mocked(commands.getAvailableModels).mockResolvedValue(
      err("model directory unreadable"),
    );

    const { result } = renderHook(() => useCurrentModel());

    await waitFor(() =>
      expect(result.current.currentModel).toBe("parakeet-v3"),
    );
    expect(result.current.models).toEqual([]);
  });

  it("logs and survives a transport failure", async () => {
    vi.mocked(commands.getCurrentModel).mockRejectedValue(
      new Error("ipc channel closed"),
    );

    const { result } = renderHook(() => useCurrentModel());

    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        "Failed to load models:",
        expect.objectContaining({ message: "ipc channel closed" }),
      ),
    );
    expect(result.current.models).toEqual([]);
    expect(result.current.currentModel).toBe("");
  });

  it("reloads when the backend announces a model state change", async () => {
    const { result } = renderHook(() => useCurrentModel());
    await waitFor(() =>
      expect(result.current.currentModel).toBe("parakeet-v3"),
    );
    expect(listen).toHaveBeenCalledWith(
      "model-state-changed",
      expect.any(Function),
    );

    vi.mocked(commands.getCurrentModel).mockResolvedValue(ok("whisper-small"));
    const onChange = vi.mocked(listen).mock.calls[0][1];
    act(() => {
      onChange({ event: "model-state-changed", id: 1, payload: null });
    });

    await waitFor(() =>
      expect(result.current.currentModel).toBe("whisper-small"),
    );
  });

  it("stops listening when unmounted", async () => {
    const { unmount } = renderHook(() => useCurrentModel());
    await waitFor(() => expect(listen).toHaveBeenCalledTimes(1));

    unmount();

    await waitFor(() => expect(unlisten).toHaveBeenCalledTimes(1));
  });
});
