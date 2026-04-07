export default function MockupPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex justify-center p-4">
      <div className="w-full max-w-[390px]">
        {/* Mockup banner */}
        <div className="mb-4 rounded-lg bg-amber-100 px-3 py-1.5 text-center text-xs font-semibold text-amber-800">
          MOCKUP — ter validatie
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* Header */}
          <div className="px-5 pb-3 pt-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-bold text-gray-900">Taken</h2>
              <span className="text-xs text-gray-400">7 actief · 10 afgerond</span>
            </div>

            {/* Toggle pills + urgentie indicator */}
            <div className="mt-3 flex items-center gap-2">
              <TabButton label="Actief" active />
              <TabButton label="Afgerond" />
              <div className="flex-1" />
              {/* Urgentie summary */}
              <span className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />5 verlopen
              </span>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* ACTIEF TAB */}
          <div className="px-5 py-4">
            {/* SECTION: Wouter */}
            <Section name="Wouter" count={4}>
              <TaskRow
                title="Tekeningetje aanleveren: hoe werkt memory op studio-, assistent- en chatniveau"
                date="verlopen · 7 apr"
                urgency="overdue"
              />
              <TaskRow
                title="Teammeeting: bespreken wanneer switch naar multi agent orchestration"
                date="verlopen · 7 apr"
                urgency="overdue"
              />
              <TaskRow
                title="Checken haalbaarheid van drie cofounder modaliteiten"
                date="verlopen · 7 apr"
                urgency="overdue"
              />
              <TaskRow
                title="Geüpdatet roadmap voorstel delen volgende week"
                date="14 apr"
                urgency="this-week"
              />
            </Section>

            {/* SECTION: Stef */}
            <Section name="Stef" count={3}>
              <TaskRow
                title="Geüpdatet roadmap voorstel maken met timing per feature"
                date="verlopen · 8 apr"
                urgency="overdue"
              />
              <TaskRow
                title="Wachten op feedback van Fleur na salesgesprek met Tibor"
                date="verlopen · 9 apr"
                urgency="overdue"
              />
              <TaskRow
                title="Dagelijks Circle support reacties plannen in agenda"
                date="10 apr"
                urgency="this-week"
              />
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}

function Section({
  name,
  count,
  children,
}: {
  name: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 last:mb-2">
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
        <span className="text-xs font-medium text-gray-400">{count} taken</span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function TaskRow({
  title,
  date,
  urgency,
}: {
  title: string;
  date: string;
  urgency: "overdue" | "this-week" | "default";
}) {
  const borderColor =
    urgency === "overdue"
      ? "border-red-500"
      : urgency === "this-week"
        ? "border-amber-400"
        : "border-transparent";

  const hoverBg =
    urgency === "overdue"
      ? "hover:bg-red-50/50"
      : urgency === "this-week"
        ? "hover:bg-amber-50/50"
        : "hover:bg-gray-50";

  const dateColor =
    urgency === "overdue"
      ? "text-red-600"
      : urgency === "this-week"
        ? "text-amber-600"
        : "text-gray-400";

  return (
    <div
      className={`flex items-start gap-2.5 rounded-r-lg border-l-[3px] py-2 pl-3 transition-colors ${borderColor} ${hoverBg}`}
    >
      <button
        type="button"
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 transition-colors hover:border-green-500 hover:bg-green-50"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-gray-900">{title}</p>
        <span className={`mt-0.5 inline-block text-[11px] font-medium ${dateColor}`}>{date}</span>
      </div>
    </div>
  );
}
