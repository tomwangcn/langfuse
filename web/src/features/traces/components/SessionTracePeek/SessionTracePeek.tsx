import { useRouter, type NextRouter } from "next/router";
import { RouterContext } from "next/dist/shared/lib/router-context.shared-runtime";
import {
  QueryParamProvider,
  type QueryParamAdapterComponent,
} from "use-query-params";
import { TablePeekViewTraceDetail } from "@/src/components/table/peek/TablePeekViewTraceDetail";
import { getTraceScopeTabs } from "@/src/features/traces/fns/getTraceScopeTabs";
import { buildTracePath } from "@langfuse/shared";
import { urlSearchParamsToQuery } from "@/src/utils/navigation";

const SessionPeekQueryAdapter: QueryParamAdapterComponent = ({ children }) => {
  const router = useRouter();
  return children({
    location: { search: new URL(router.asPath, "http://peek.local").search },
    push: (location) => {
      router.push(
        { pathname: router.pathname, search: location.search },
        undefined,
        { shallow: true, scroll: false },
      );
    },
    replace: (location) => {
      router.replace(
        { pathname: router.pathname, search: location.search },
        undefined,
        { shallow: true, scroll: false },
      );
    },
  });
};

export function SessionTracePeek({
  projectId,
  search,
  onClose,
}: {
  projectId: string;
  search: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const params = new URLSearchParams(search);
  const traceId = params.get("peek");

  // Detail components can keep using their normal query params without changing
  // the session's selection, filters, tab, or outer peek identity.
  const navigate = (
    method: "push" | "replace",
    ...[url, as, options]: Parameters<NextRouter["push"]>
  ) => {
    const target =
      typeof url === "string" ? new URL(url, "http://peek.local") : url;
    const pathname = target.pathname;
    if (
      pathname &&
      pathname !== router.pathname &&
      pathname !== router.asPath.split("?")[0]
    ) {
      return router[method](url, as, options);
    }
    const query =
      typeof url === "string"
        ? urlSearchParamsToQuery(
            new URLSearchParams(new URL(url, "http://peek.local").search),
          )
        : (url.query ??
          urlSearchParamsToQuery(new URLSearchParams(url.search ?? "")));
    const next = new URLSearchParams();
    if (typeof query === "string") {
      new URLSearchParams(query).forEach((value, key) =>
        next.append(key, value),
      );
    } else {
      for (const [key, value] of Object.entries(query ?? {})) {
        if (key === "projectId" || key === "sessionId") continue;
        if (Array.isArray(value)) {
          for (const entry of value) next.append(key, String(entry));
        } else if (value !== undefined && value !== null) {
          next.set(key, String(value));
        }
      }
    }
    return router[method](
      {
        pathname: router.pathname,
        query: { ...router.query, sessionPeek: next.toString() },
      },
      undefined,
      { ...options, shallow: true },
    );
  };

  const scopedRouter: NextRouter = {
    ...router,
    query: { projectId, ...urlSearchParamsToQuery(params) },
    asPath: `${router.asPath.split("?")[0]}?${search}`,
    push: (...args) => navigate("push", ...args),
    replace: (...args) => navigate("replace", ...args),
  };

  return (
    <RouterContext.Provider value={scopedRouter}>
      <QueryParamProvider adapter={SessionPeekQueryAdapter}>
        <TablePeekViewTraceDetail
          projectId={projectId}
          itemType="TRACE"
          tableName="session-detail"
          isV4
          layout={params.has("observation") ? "observation-focused" : "default"}
          closePeek={onClose}
          titleTabs={getTraceScopeTabs({
            value: "trace",
            canSelectSession: true,
            onValueChange: (value) => {
              if (value === "session") onClose();
            },
          })}
          expandPeek={() => {
            if (!traceId) return;
            const path = buildTracePath({ projectId, traceId });
            const url = new URL(path, window.location.origin);
            params.forEach((value, key) => {
              if (key !== "peek") url.searchParams.set(key, value);
            });
            window.open(
              `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${url.pathname}${url.search}`,
              "_blank",
            );
          }}
        />
      </QueryParamProvider>
    </RouterContext.Provider>
  );
}
