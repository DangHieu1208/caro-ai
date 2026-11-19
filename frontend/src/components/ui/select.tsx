import * as SelectPrimitive from '@radix-ui/react-select'
import {
    Check,
    ChevronDown,
    ChevronUp,
} from 'lucide-react'

interface SelectOption {
    value: string
    label: string
    disabled?: boolean
}

interface SelectProps {
    value: string
    options: SelectOption[]
    label: string
    disabled?: boolean
    onValueChange: (value: string) => void
}

export function Select({
                           value,
                           options,
                           label,
                           disabled = false,
                           onValueChange,
                       }: SelectProps) {
    return (
        <SelectPrimitive.Root
            value={value}
            disabled={disabled}
            onValueChange={onValueChange}
        >
            <SelectPrimitive.Trigger
                aria-label={label}
                className="lab-control flex items-center justify-between gap-2 text-left"
            >
        <span className="min-w-0 flex-1 truncate">
          <SelectPrimitive.Value />
        </span>

                <SelectPrimitive.Icon asChild>
                    <ChevronDown
                        size={15}
                        className="shrink-0 text-muted-foreground"
                    />
                </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>

            <SelectPrimitive.Portal>
                <SelectPrimitive.Content
                    position="popper"
                    sideOffset={5}
                    collisionPadding={8}
                    className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border bg-card text-card-foreground shadow-lg"
                >
                    <SelectPrimitive.ScrollUpButton className="flex items-center justify-center py-1">
                        <ChevronUp size={15} />
                    </SelectPrimitive.ScrollUpButton>

                    <SelectPrimitive.Viewport className="max-h-[min(240px,var(--radix-select-content-available-height))] p-1">
                        {options.map((option) => (
                            <SelectPrimitive.Item
                                key={option.value}
                                value={option.value}
                                disabled={option.disabled}
                                className="relative flex cursor-default select-none items-center rounded-sm py-2 pl-3 pr-8 text-sm outline-none data-[highlighted]:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-40"
                            >
                                <SelectPrimitive.ItemText>
                                    {option.label}
                                </SelectPrimitive.ItemText>

                                <SelectPrimitive.ItemIndicator className="absolute right-2 flex items-center justify-center">
                                    <Check size={15} />
                                </SelectPrimitive.ItemIndicator>
                            </SelectPrimitive.Item>
                        ))}
                    </SelectPrimitive.Viewport>

                    <SelectPrimitive.ScrollDownButton className="flex items-center justify-center py-1">
                        <ChevronDown size={15} />
                    </SelectPrimitive.ScrollDownButton>
                </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
    )
}
