import { createFileRoute } from "@tanstack/react-router";
import { AiVisibilityPage } from "@/client/features/laojin/ai-visibility/AiVisibilityPage";

export const Route = createFileRoute("/_project/p/$projectId/ai-visibility")({
  component: RouteComponent,
});

function RouteComponent() {
  const { projectId } = Route.useParams();
  return <AiVisibilityPage projectId={projectId} />;
}
