import { fireEvent, render, screen } from "@testing-library/react";
import { type ComponentProps } from "react";
import { vi } from "vitest";
import { TraceHeader } from "./TraceHeader";
import { createPeekHeaderActions } from "@/src/components/ObservabilityEntityDetailHeader/fns/createPeekHeaderActions";
import { type ObservabilityEntityDetailHeader } from "@/src/components/ObservabilityEntityDetailHeader/ObservabilityEntityDetailHeader";
import { type SessionMetadataJsonPathControl } from "@/src/features/sessions/SessionMetadataJsonPathControl";
import { type FloatingController } from "@/src/components/design-system/FloatingController/FloatingController";
import { type AnnotateDrawerController } from "@/src/features/scores/components/AnnotateDrawerController";
import { type CommentDrawerController } from "@/src/features/comments/CommentDrawerController";
import { type AnnotationQueueSubmenuItemController } from "@/src/features/annotation-queues/components/AnnotationQueueSubmenuItemController";

const mocks = vi.hoisted(() => ({
  annotate: vi.fn(),
  comment: vi.fn(),
  queue: vi.fn(),
  queueProps: vi.fn(),
  session: {
    data: {
      countTraces: 12,
      minTimestamp: new Date("2026-01-01T00:00:00Z"),
      maxTimestamp: new Date("2026-01-01T00:02:00Z"),
      inputUsage: 100,
      outputUsage: 200,
      totalTokens: 300,
      totalCost: 1.5,
      users: ["session-user"],
      scores: [
        {
          id: "session-score",
          name: "session-quality",
          value: 1,
          source: "ANNOTATION",
          dataType: "NUMERIC",
        },
      ],
    },
  },
}));

vi.mock("@/src/features/traces/contexts/TraceDataProvider", () => ({
  useTraceData: () => ({
    trace: null,
    projectId: "project-1",
    sessionId: "session-1",
    observations: [],
    mergedScores: [],
    isPlaceholderData: false,
  }),
}));
vi.mock("@/src/features/sessions/hooks/useSessionViewSelection", () => ({
  useSessionViewSelection: () => ({
    configuration: { filters: [], unmatchedTraces: "show" },
  }),
}));
vi.mock("@/src/utils/api", () => ({
  api: {
    sessions: {
      byIdWithScoresFromEvents: { useQuery: () => mocks.session },
      tracesFromEvents: {
        useQuery: () => ({ isSuccess: true, data: [{ id: "trace-1" }] }),
      },
    },
    comments: {
      getCountByObjectId: {
        useQuery: () => ({
          data: new Map([["session-1", 3]]),
          refetch: vi.fn(),
        }),
      },
    },
  },
}));
vi.mock("@/src/features/traces/contexts/ViewPreferencesProvider", () => ({
  useViewPreferences: () => ({ isAnnotationMode: false }),
}));
vi.mock("@/src/features/events/hooks/useReadPath", () => ({
  useReadPath: () => ({ isV4: true }),
}));
vi.mock("@/src/features/auth/hooks", () => ({
  useIsAuthenticatedAndProjectMember: () => true,
}));
vi.mock("@/src/features/feature-flags/hooks/useIsFeatureEnabled", () => ({
  default: () => true,
}));
vi.mock("@/src/features/posthog-analytics/usePostHogClientCapture", () => ({
  usePostHogClientCapture: () => vi.fn(),
}));
vi.mock("@/src/features/topics/trace/useTraceTopicFacets", () => ({
  useTraceTopicFacets: () => [],
}));
vi.mock(
  "@/src/features/traces/components/ConnectedTraceObservationAddToDropdownMenuController",
  () => ({ ConnectedTraceObservationAddToDropdownMenuController: () => null }),
);
vi.mock("@/src/features/scores/components/AnnotateDrawerController", () => ({
  AnnotateDrawerController: ({
    children,
  }: ComponentProps<typeof AnnotateDrawerController>) =>
    children({ disabled: false, openDrawer: mocks.annotate }),
}));
vi.mock("@/src/features/comments/CommentDrawerController", () => ({
  CommentDrawerController: ({
    children,
  }: ComponentProps<typeof CommentDrawerController>) =>
    children({ disabled: false, openDrawer: mocks.comment }),
}));
vi.mock(
  "@/src/features/annotation-queues/components/AnnotationQueueSubmenuItemController",
  () => ({
    AnnotationQueueSubmenuItemController: ({
      children,
      ...props
    }: ComponentProps<typeof AnnotationQueueSubmenuItemController>) => {
      mocks.queueProps(props);
      return children({
        item: {
          id: "queue",
          type: "item",
          title: "Add to queue",
          onClick: mocks.queue,
        },
        totalCount: 2,
      });
    },
  }),
);
vi.mock(
  "@/src/components/design-system/FloatingController/FloatingController",
  () => ({
    FloatingController: ({
      children,
    }: ComponentProps<typeof FloatingController>) =>
      children({ getTriggerProps: () => ({}) }),
  }),
);
vi.mock("@/src/features/sessions/SessionMetadataJsonPathControl", () => ({
  SessionMetadataJsonPathControl: ({
    children,
  }: ComponentProps<typeof SessionMetadataJsonPathControl>) =>
    children({
      paths: ["$.customer"],
      source: {
        state: "ready",
        metadata: { customer: "session-customer" },
        metadataTruncated: false,
      },
      onEditorOpenChange: vi.fn(),
      onSave: vi.fn(),
      onRemove: vi.fn(),
    }),
}));
vi.mock(
  "@/src/components/ObservabilityEntityDetailHeader/ObservabilityEntityDetailHeader",
  () => ({
    ObservabilityEntityDetailHeader: ({
      metrics,
      headerProps,
    }: ComponentProps<typeof ObservabilityEntityDetailHeader>) => (
      <div>
        <div>{JSON.stringify(metrics)}</div>
        {headerProps.actions?.map((action) => {
          if (action.type === "button")
            return (
              <button key={action.id} onClick={action.onClick}>
                {action.label} {action.count}
              </button>
            );
          if (action.type === "dropdown")
            return (
              <div key={action.id}>
                {action.label} {action.count}
                {action.items.map((item) =>
                  item.type === "item" ? (
                    <button key={item.id} onClick={() => item.onClick?.()}>
                      {item.title}
                    </button>
                  ) : null,
                )}
              </div>
            );
          return null;
        })}
      </div>
    ),
  }),
);

it("shows session totals, users, scores and editable metadata instead of trace aggregates", () => {
  render(
    <TraceHeader
      header={{
        variant: "page",
        headerProps: {
          title: "session-1",
          itemType: "SESSION",
          actions: [],
        },
      }}
    />,
  );
  const header = screen.getByText(/12 traces/);
  expect(header).toHaveTextContent("duration 120");
  expect(header).toHaveTextContent("cost 1.5");
  expect(header).toHaveTextContent("tokens 100 200 300");
  expect(header).toHaveTextContent("session-user");
  expect(header).toHaveTextContent("session-quality");
  expect(header).toHaveTextContent("session-customer");
  expect(header).toHaveTextContent("Edit Metadata");
});

it("targets session annotation, comments and queues and displays their counts", () => {
  render(
    <TraceHeader
      header={{
        variant: "peek",
        headerProps: {
          title: "session-1",
          itemType: "SESSION",
          actions: createPeekHeaderActions({ onClose: vi.fn() }),
        },
      }}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Annotate 1" }));
  expect(mocks.annotate).toHaveBeenCalledWith(
    expect.objectContaining({
      scoreTarget: { type: "session", sessionId: "session-1" },
      scores: mocks.session.data.scores,
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Comments 3" }));
  expect(mocks.comment).toHaveBeenCalledWith(
    expect.objectContaining({
      objectId: "session-1",
      objectType: "SESSION",
    }),
  );
  expect(screen.getByText("Add to 2")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Add to queue" }));
  expect(mocks.queue).toHaveBeenCalled();
  expect(mocks.queueProps).toHaveBeenCalledWith(
    expect.objectContaining({
      projectId: "project-1",
      objectId: "session-1",
      objectType: "SESSION",
    }),
  );
});
