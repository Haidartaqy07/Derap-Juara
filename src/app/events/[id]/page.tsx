import PublicEventDetail from '@/components/public/public-event-detail';

export default async function PublicEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PublicEventDetail eventId={id} />;
}
