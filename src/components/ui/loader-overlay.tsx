import React from "react";
import { cn } from "@/libs/utils";

interface LoaderOverlayProps {
  isLoading: boolean;
  children?: React.ReactNode;
  className?: string;
}

const LoaderOverlay: React.FC<LoaderOverlayProps> = ({
  isLoading,
  children,
  className,
}) => {
  return (
    <div className={cn("relative", className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}
    </div>
  );
};

export default LoaderOverlay;
