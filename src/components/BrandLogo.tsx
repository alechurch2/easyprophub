import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  className?: string;
  iconOnly?: boolean;
}

const sizes = {
  sm: { box: "h-8 w-8", text: "text-base", fontSize: "text-[11px]" },
  md: { box: "h-10 w-10", text: "text-xl", fontSize: "text-xs" },
  lg: { box: "h-14 w-14", text: "text-2xl", fontSize: "text-sm" },
};

export default function BrandLogo({ size = "md", showName = true, className, iconOnly }: BrandLogoProps) {
  const s = sizes[size];

  const icon = BRAND.logoIcon || BRAND.logo ? (
    <img src={(iconOnly ? BRAND.logoIcon : BRAND.logo) || BRAND.logoIcon || BRAND.logo!} alt={BRAND.name} className={cn(s.box, "rounded-xl object-contain")} />
  ) : (
    <div className={cn(s.box, "rounded-xl bg-primary flex items-center justify-center")}>
      <span className={cn(s.fontSize, "font-bold text-primary-foreground tracking-tight")}>EP</span>
    </div>
  );

  if (iconOnly || !showName) return <div className={className}>{icon}</div>;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {icon}
      <span className={cn("font-heading font-bold text-foreground", s.text)}>{BRAND.name}</span>
    </div>
  );
}
