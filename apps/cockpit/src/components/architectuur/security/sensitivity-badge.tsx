interface SensitivityBadgeProps {
  level: "hoog" | "midden" | "laag" | "publiek" | "kritiek";
}

const styles: Record<string, string> = {
  kritiek: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  hoog: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  midden: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  laag: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  publiek: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

export function SensitivityBadge({ level }: SensitivityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[level]}`}
    >
      {level}
    </span>
  );
}
