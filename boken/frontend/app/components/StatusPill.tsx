import { webtoonStatusLabel } from "@/lib/format";

const DOT: Record<string, string> = {
  "in progress": "bg-jade",
  pause: "bg-ochre",
  cancel: "bg-seal",
};

export default function StatusPill({ status }: { status?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-sheet px-2.5 py-1 text-xs font-semibold">
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status ?? ""] ?? "bg-muted"}`} />
      {webtoonStatusLabel(status)}
    </span>
  );
}
