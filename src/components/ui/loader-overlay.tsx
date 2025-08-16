import { Loader2 } from "lucide-react";
import React from "react";

interface LoaderOverlayProps {
  isLoading: boolean;
}

const tips = [
  "Hey, did you know optimizing your website for local SEO and encouraging reviews can skyrocket your visibility in local searches?",
  "Hey, did you know building relationships with local businesses and sponsoring community events can strengthen your brand's local presence?",
  "Hey, did you know offering exclusive promotions to nearby customers can bring in more foot traffic and boost sales?",
  "Hey, did you know staying active on social media platforms like Instagram and Nextdoor can keep you connected with your local audience and grow your business?",
];

export const LoaderOverlay: React.FC<LoaderOverlayProps> = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 size={20} className="animate-spin stroke-indigo-400" />
        <span className="">Loading data...</span>
        <div className="max-w-[30%] text-lg text-center text-foreground/80">
          <b className="bg-indigo-200 text-black px-1">Quick Tip:</b> {tips[0]}
        </div>
        {/* <p className="text-white text-sm font-medium">Loading...</p> */}
      </div>
    </div>
  );
};

export default LoaderOverlay;
