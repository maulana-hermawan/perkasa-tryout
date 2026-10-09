import { cn } from "@/lib/utils";

/**
 * A plain `<select>` styled like the rest of the form controls.
 *
 * Deliberately native: on mobile it opens the OS wheel picker, which is far
 * easier to hit than a Radix popover while a timer is running.
 */
export function NativeSelect({
  value,
  onValueChange,
  options,
  placeholder = "—",
  disabled,
  className,
  ariaLabel,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      disabled={disabled}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      className={cn(
        "h-9 min-w-16 shrink-0 rounded-lg border border-input bg-background px-2 text-sm shadow-xs outline-none",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export default NativeSelect;
