import { ReactNode } from "react";

interface BotBuilderLayoutProps {
  children: ReactNode;
}

export default function BotBuilderLayout({ children }: BotBuilderLayoutProps) {
  return <div className="h-screen w-screen overflow-hidden">{children}</div>;
}
