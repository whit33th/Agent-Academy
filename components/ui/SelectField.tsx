"use client";

import { useCallback, useState } from "react";
import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import Image from "@/components/ui/CatalogImage";

interface SelectOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  icon?: string;
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}

export default function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
  className = "",
}: SelectFieldProps<T>) {
  const [container, setContainer] = useState<HTMLElement | undefined>();
  const selected = options.find((item) => item.value === value);
  const showIcons = options.some((item) => item.icon);
  const triggerRef = useCallback((node: HTMLButtonElement | null) => {
    // Keep the menu in a native modal's top layer, outside its clipped card.
    if (node) setContainer(node.closest("dialog") ?? undefined);
  }, []);
  return (
    <Select.Root
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        const option = options.find(
          (item) => item.value === next && !item.disabled,
        );
        if (option) onChange(option.value);
      }}
    >
      <Select.Trigger
        ref={triggerRef}
        aria-label={label}
        className={`group flex h-10 min-w-0 items-center justify-between gap-2 rounded-sm border border-white/12 bg-val-elevated px-3 text-left text-sm font-medium text-val-cream outline-none transition-[border-color,background-color,box-shadow] hover:border-white/25 focus-visible:border-val-red focus-visible:ring-2 focus-visible:ring-val-red/20 data-[state=open]:border-val-red/60 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected?.icon && <RankIcon src={selected.icon} />}
          <Select.Value className="truncate" />
        </span>
        <Select.Icon>
          <ChevronDown
            aria-hidden
            size={15}
            className="shrink-0 text-white/45 transition-transform group-data-[state=open]:rotate-180"
          />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal container={container}>
        <Select.Content
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className="z-[500] min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-24px)] overflow-hidden rounded-sm border border-white/15 bg-val-elevated p-1 shadow-[0_12px_40px_rgba(0,0,0,0.65)] outline-none"
          onEscapeKeyDown={(event) => event.stopPropagation()}
        >
          <Select.Viewport
            className="select-field-viewport max-h-[min(280px,var(--radix-select-content-available-height))]"
            data-lenis-prevent
          >
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="relative flex min-h-10 cursor-pointer select-none items-center gap-2.5 rounded-xs py-2 pl-3 pr-10 text-sm font-medium text-white/65 outline-none data-[highlighted]:bg-white/8 data-[highlighted]:text-white data-[state=checked]:bg-val-red/10 data-[state=checked]:text-val-red data-[disabled]:pointer-events-none data-[disabled]:opacity-30"
              >
                {showIcons &&
                  (option.icon ? (
                    <RankIcon src={option.icon} />
                  ) : (
                    <span className="size-5 shrink-0" aria-hidden />
                  ))}
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="absolute right-4">
                  <Check size={14} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function RankIcon({ src }: { src: string }) {
  return (
    <Image
      src={src}
      alt=""
      width={20}
      height={20}
      className="size-5 shrink-0 object-contain"
    />
  );
}
