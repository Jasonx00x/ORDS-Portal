import { ConsultationBookingPage } from "@/components/consultations/ConsultationBookingPage";

export default async function BookConsultationPage({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string }>;
}) {
  const params = await searchParams;
  return <ConsultationBookingPage embedded={params.embed === "1"} />;
}
