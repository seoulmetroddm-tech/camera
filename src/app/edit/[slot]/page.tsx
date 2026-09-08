import { MAX_SLOTS } from "@/types";
import EditClient from "./EditClient";

export function generateStaticParams() {
  return Array.from({ length: MAX_SLOTS }, (_, index) => ({ slot: String(index) }));
}

export default async function EditPage({ params }: { params: Promise<{ slot: string }> }) {
  const { slot } = await params;
  return <EditClient index={Number(slot)} />;
}
