// Force static rendering for all trip pages
export const dynamic = 'force-static';
export const revalidate = false;

export default function TripLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
