import * as React from "react";
import { Button, type ButtonProps } from "./button";
import { Tooltip, TooltipTrigger, TooltipContent } from "./tooltip";
import { onFlash } from "../KeyboardShortcuts";

interface TooltipButtonProps extends ButtonProps {
  tooltip: string;
  side?: "top" | "bottom" | "left" | "right";
  /** Keyboard action ID — button flashes when this shortcut fires */
  actionId?: string;
}

const TooltipButton = React.forwardRef<HTMLButtonElement, TooltipButtonProps>(
  ({ tooltip, side = "bottom", actionId, className, ...props }, ref) => {
    const [flash, setFlash] = React.useState(false);

    React.useEffect(() => {
      if (!actionId) return;
      return onFlash((id) => {
        if (id === actionId) {
          setFlash(true);
          setTimeout(() => setFlash(false), 150);
        }
      });
    }, [actionId]);

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={ref}
            className={`${className ?? ""} ${flash ? "ring-2 ring-primary brightness-125" : ""}`.trim()}
            {...props}
          />
        </TooltipTrigger>
        <TooltipContent side={side}>
          {tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }
);
TooltipButton.displayName = "TooltipButton";

export { TooltipButton };
