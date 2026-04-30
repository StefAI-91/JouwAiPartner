"use client";

import { X } from "lucide-react";

interface TagOption {
  id: string;
  name: string;
}

interface MetadataTagSelectorProps<T extends TagOption> {
  label: string;
  selected: T[];
  available: T[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
  addPlaceholder: string;
  newOptionLabel: string;
  formatOption?: (option: T) => string;
}

/**
 * Shared chip + dropdown selector used in the EditMetadataModal for both
 * projects and participants. Selected items render as removable chips; the
 * dropdown lists remaining options plus a "+ new" trigger that the parent
 * resolves via `onAdd("__new__")`.
 */
export function MetadataTagSelector<T extends TagOption>({
  label,
  selected,
  available,
  onAdd,
  onRemove,
  disabled,
  addPlaceholder,
  newOptionLabel,
  formatOption,
}: MetadataTagSelectorProps<T>) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
            >
              {item.name}
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                disabled={disabled}
                className="rounded-full p-0.5 hover:bg-background/80"
                aria-label={`${item.name} verwijderen`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <select
        key={selected.length}
        onChange={(e) => {
          onAdd(e.target.value);
          e.target.value = "";
        }}
        disabled={disabled}
        defaultValue=""
        className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
      >
        <option value="" disabled>
          {addPlaceholder}
        </option>
        {available.map((option) => (
          <option key={option.id} value={option.id}>
            {formatOption ? formatOption(option) : option.name}
          </option>
        ))}
        <option value="__new__">{newOptionLabel}</option>
      </select>
    </div>
  );
}
