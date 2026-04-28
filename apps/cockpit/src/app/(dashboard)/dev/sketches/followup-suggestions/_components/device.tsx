import type { ReactNode } from "react";

export function DeviceMobile({ children }: { children: ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-[28px] bg-white"
      style={{ width: 360, border: "8px solid #1f2937" }}
    >
      {children}
    </div>
  );
}

export function DeviceDesktop({ children }: { children: ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-white shadow-md"
      style={{ width: 720 }}
    >
      {children}
    </div>
  );
}

export function DeviceRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-start gap-8">{children}</div>;
}
