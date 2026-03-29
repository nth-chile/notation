import * as React from "react";
import { cn } from "@/lib/utils";

interface ContextMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
}

export function ContextMenu({ trigger, children }: ContextMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <>
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          setPos({ x: e.clientX, y: e.clientY });
          setOpen(true);
        }}
      >
        {trigger}
      </div>
      {open && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[180px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
          style={{ left: pos.x, top: pos.y }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </>
  );
}

export function ContextMenuItem({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center rounded-sm px-2 py-1.5 text-sm cursor-pointer",
        disabled ? "text-muted-foreground opacity-50 cursor-default" : "hover:bg-accent hover:text-accent-foreground"
      )}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function ContextMenuSeparator() {
  return <div className="-mx-1 my-1 h-px bg-border" />;
}

export function ContextMenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
      {children}
    </div>
  );
}

export function ContextMenuCheckbox({
  children,
  checked,
  onCheckedChange,
}: {
  children: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
      onClick={() => onCheckedChange(!checked)}
    >
      <span className="w-4 text-center">{checked ? "✓" : ""}</span>
      {children}
    </button>
  );
}
