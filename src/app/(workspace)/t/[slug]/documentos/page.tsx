import { redirect } from "next/navigation";
export default async function FormerDocumentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/t/${encodeURIComponent(slug)}/gantt`);
}
