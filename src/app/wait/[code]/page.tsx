import WaitingRoom from '@/components/patient/WaitingRoom';

interface Props {
  params: { code: string };
}

export default function WaitPage({ params }: Props) {
  return <WaitingRoom accessCode={params.code.toUpperCase()} />;
}

export async function generateMetadata({ params }: Props) {
  return {
    title: `Token ${params.code.toUpperCase()} — Queue Cure`,
    description: 'Track your position in the queue. Updates in real time.',
  };
}
