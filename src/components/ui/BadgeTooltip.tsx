import { Badge, Tooltip, TooltipContent, TooltipTrigger } from "."

export const BadgeTooltip = ({ children, tooltip, variant = "default", className = "", icon }: { children: React.ReactNode, tooltip: string, variant?: "default" | "secondary" | "destructive" | "outline", className?: string, icon?: React.ReactNode }) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={variant} className={className}>
          {icon && <span className="size-4">{icon}</span>}
          {children}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}