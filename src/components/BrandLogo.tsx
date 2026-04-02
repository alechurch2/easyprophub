import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";
import logoImage from "@/assets/logo.png";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  className?: string;
  iconOnly?: boolean;
}

const sizes = {
  sm: { height: "h-7", iconBox: "h-8 w-8", fontSize: "text-[11px]" },
  md: { height: "h-9", iconBox: "h-10 w-10", fontSize: "text-xs" },
  lg: { height: "h-12", iconBox: "h-14 w-14", fontSize: "text-sm" },
};

export default function BrandLogo({ size = "md", className, iconOnly }: BrandLogoProps) {
  const s = sizes[size];

  if (!iconOnly) {
    return (
      <div className={cn("transition-opacity", className)}>
        <img src={logoImage} alt={BRAND.name} className={cn(s.height, "w-auto object-contain")} />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className={cn(s.iconBox, "rounded-xl bg-gradient-to-br from-primary to-gold-dark flex items-center justify-center shadow-sm shadow-primary/20")}>
        <span className={cn(s.fontSize, "font-bold text-primary-foreground tracking-tight")}>EP</span>
      </div>
    </div>
  );
}
