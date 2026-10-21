import { Card } from "../../components/ui";

export default function StatCard({ label, value, caption }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-2 text-[28px] font-bold leading-none tracking-tight text-neutral-900">{value}</p>
      <p className="mt-3 text-[11px] text-neutral-500">{caption}</p>
    </Card>
  );
}
