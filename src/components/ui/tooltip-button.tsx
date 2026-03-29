import * as React from "react";
import { Button, type ButtonProps } from "./button";
import { Tooltip, TooltipTrigger, TooltipContent } from "./tooltip";

interface TooltipButtonProps extends ButtonProps {
  tooltip: string;
  side?: "top" | "bottom" | "left" | "right";
}

const TooltipButton = React.forwardRef<HTMLButtonElement, TooltipButtonProps>(
  ({ tooltip, side = "bottom", ...props }, ref) => {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button ref={ref} {...props} />
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
