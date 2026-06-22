import WaitingRoom from '@/components/patient/WaitingRoom';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function WaitPage({ params }: Props) {
  const { code } = await params;
  return <WaitingRoom accessCode={code.toUpperCase()} />;
}

export async function generateMetadata({ params }: Props) {
  const { code } = await params;
  return {
    title: `Token ${code.toUpperCase()} — Queue Cure`,
    description: 'Track your position in the queue. Updates in real time.',
  };
}
