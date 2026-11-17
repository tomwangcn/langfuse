import { useMediaQuery } from "react-responsive";
import { type DataTablePeekViewProps } from "@/src/components/table/peek";
import { TopicsEmptyState } from "./TopicsEmptyState";
import { type Facet, type UseTopicTraces } from "./facet-topics";
import { prepareTopicDisplay } from "./prepare-topic-display";
import { TopicTreemap } from "./TopicTreemap";
import { TopicTraceList } from "./TopicTraceList";
import { TopicsSplit } from "./TopicsSplit";
import { topicSearchSelection } from "./topic-selection";

type TopicTreemapViewProps = {
  projectId: string;
  facet: Facet;
  peekView: DataTablePeekViewProps;
  /** Treemap left, traces right on wide screens. */
  sideBySide?: boolean;
  /** Applied to the trace list only when side by side, so the peek matches its width. */
  tracePanelRef?: (element: HTMLElement | null) => void;
  useTraces: UseTopicTraces;
  /** The page's trace search and filters; picking a tile writes its topic there. */
  traceFilters: Parameters<typeof topicSearchSelection>[0]["traceFilters"];
};

export function TopicTreemapView({
  projectId,
  facet,
  peekView,
  sideBySide = false,
  tracePanelRef,
  useTraces,
  traceFilters,
}: TopicTreemapViewProps) {
  const { topics, total } = prepareTopicDisplay(facet, "treemap");
  const { selected, isSearching, query, selectTopic, listProps } =
    topicSearchSelection({ projectId, facet, topics, traceFilters });
  const traces = useTraces(query);
  const isWide = useMediaQuery({ query: "(min-width: 1024px)" });
  const horizontal = sideBySide && isWide;
  if (facet.topics.length === 0) {
    return <TopicsEmptyState />;
  }
  return (
    <TopicsSplit
      id="topics-treemap-split"
      orientation={horizontal ? "horizontal" : "vertical"}
      defaultTopicsSize={horizontal ? "60%" : "50%"}
      topics={
        <TopicTreemap
          total={total}
          topics={topics}
          selectedTopicId={selected?.id ?? null}
          onSelectTopic={selectTopic}
        />
      }
      traces={
        <TopicTraceList
          key={isSearching ? "search" : (selected?.id ?? "all")}
          projectId={projectId}
          {...listProps}
          traces={traces}
          peekView={peekView}
          tracePanelRef={horizontal ? tracePanelRef : undefined}
          divider="none"
        />
      }
    />
  );
}
