import dynamic from 'next/dynamic';

const PropertyDetailsPage = dynamic(() => import('./PropertyDetailsPage'), {
  ssr: false,
});


export default function Page({ params }: { params: { id: string } }) {
  return <PropertyDetailsPage />;
}
