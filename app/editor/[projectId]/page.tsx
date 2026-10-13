import Studio from "@/components/studio";
export default async function Editor({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <Studio projectId={projectId} />;
}
