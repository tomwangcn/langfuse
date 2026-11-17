import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RouterContext } from "next/dist/shared/lib/router-context.shared-runtime";
import { type NextRouter, useRouter } from "next/router";
import { StringParam, useQueryParam } from "use-query-params";
import { SessionTracePeek } from "./SessionTracePeek";

vi.mock("@/src/components/table/peek/TablePeekViewTraceDetail", () => ({
  TablePeekViewTraceDetail: ({
    closePeek,
    titleTabs,
  }: {
    closePeek: () => void;
    titleTabs: { onValueChange: (value: string) => void };
  }) => {
    const router = useRouter();
    const [observation, setObservation] = useQueryParam(
      "observation",
      StringParam,
    );
    return (
      <div>
        <span>{router.query.peek}</span>
        <span>{observation}</span>
        <button onClick={() => setObservation("next-observation", "pushIn")}>
          Select observation
        </button>
        <button
          onClick={() =>
            router.replace({
              pathname: router.pathname,
              query: { ...router.query, traceTab: "metadata" },
            })
          }
        >
          Select detail tab
        </button>
        <button onClick={closePeek}>Close detail</button>
        <button onClick={() => titleTabs.onValueChange("session")}>
          Session
        </button>
      </div>
    );
  },
}));

function setup() {
  const router: NextRouter = {
    pathname: "/project/[projectId]/sessions",
    route: "/project/[projectId]/sessions",
    asPath: "/project/p1/sessions?peek=session-1&traceView=messages",
    query: {
      projectId: "p1",
      peek: "session-1",
      traceView: "messages",
      sessionPeek: "peek=trace-1&observation=observation-1&aggregation=trace",
    },
    basePath: "",
    isLocaleDomain: false,
    isReady: true,
    isFallback: false,
    isPreview: false,
    push: vi.fn().mockResolvedValue(true),
    replace: vi.fn().mockResolvedValue(true),
    back: vi.fn(),
    forward: vi.fn(),
    reload: vi.fn(),
    prefetch: vi.fn().mockResolvedValue(undefined),
    beforePopState: vi.fn(),
    events: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
  };
  const onClose = vi.fn();
  render(
    <RouterContext.Provider value={router}>
      <SessionTracePeek
        projectId="p1"
        search={String(router.query.sessionPeek)}
        onClose={onClose}
      />
    </RouterContext.Provider>,
  );
  return { router, onClose };
}

describe("session detail stacked peek", () => {
  it("reads the trace and observation without taking over the session peek", () => {
    setup();
    expect(screen.getByText("trace-1")).toBeInTheDocument();
    expect(screen.getByText("observation-1")).toBeInTheDocument();
    expect(screen.queryByText("session-1")).toBeNull();
  });

  it("isolates query-param observation selection from the session workspace", async () => {
    const { router } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Select observation" }));
    await waitFor(() => expect(router.push).toHaveBeenCalled());
    expect(router.push).toHaveBeenCalledWith(
      {
        pathname: router.pathname,
        query: {
          ...router.query,
          sessionPeek:
            "peek=trace-1&observation=next-observation&aggregation=trace",
        },
      },
      undefined,
      expect.objectContaining({ shallow: true }),
    );
  });

  it("isolates router-based detail tab changes", () => {
    const { router } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Select detail tab" }));
    expect(router.replace).toHaveBeenCalledWith(
      {
        pathname: router.pathname,
        query: {
          ...router.query,
          sessionPeek:
            "peek=trace-1&observation=observation-1&aggregation=trace&traceTab=metadata",
        },
      },
      undefined,
      { shallow: true },
    );
  });

  it.each(["Close detail", "Session"])("%s returns to the session", (label) => {
    const { onClose, router } = setup();
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(router.push).not.toHaveBeenCalled();
  });
});
