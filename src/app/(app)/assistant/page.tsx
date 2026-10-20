import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { AskLedger } from "@/components/assistant/ask-ledger";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ask Ledger" };

const EXAMPLES = [
  "Spent 500 on transport to come back home",
  "Budget 1300 a day for transport",
  "Add bill Netflix 2609 due 21",
  "Borrowed 5000 from Mom",
];

export default async function AssistantPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <PageHeader
        title="Ask Ledger"
        subtitle="Speak or type a sentence. It becomes a record once you confirm it."
      />
      <AskLedger autoFocus currency={user.currency || "XAF"} examples={EXAMPLES} />
    </>
  );
}
