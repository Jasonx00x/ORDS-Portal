import { ConsultationBookingPage } from "@/components/consultations/ConsultationBookingPage";
import { parseConsultationEmbedConfig } from "@/lib/consultations/embed";

export default async function BookConsultationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const embedded = params.embed === "1";
  return (
    <ConsultationBookingPage
      embedConfig={parseConsultationEmbedConfig(params)}
      embedded={embedded}
    />
  );
}
