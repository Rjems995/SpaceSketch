import SharedViewer from "@/components/shared-viewer";
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedViewer token={token} />;
}
