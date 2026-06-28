"use client";
import { cn } from "../../lib/utils";
import React, { ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <div
      className={cn(
        "relative flex flex-col h-full w-full bg-[#0a0a0a] text-white transition-bg",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={cn(
            "absolute -inset-[10px] opacity-30 will-change-transform",
            "aurora-gradient-bg",
            showRadialGradient &&
              "mask-radial-gradient"
          )}
        ></div>
      </div>
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};
