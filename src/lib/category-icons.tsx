import {
  ArrowRightLeft,
  BedDouble,
  BookOpen,
  Building2,
  CircleParking,
  CloudRain,
  Droplets,
  Footprints,
  Gauge,
  GitFork,
  IdCard,
  LifeBuoy,
  Milestone,
  Moon,
  Mountain,
  Ruler,
  Scale,
  ShieldCheck,
  Siren,
  Smile,
  TrafficCone,
  Truck,
  Wine,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  ArrowRightLeft,
  BedDouble,
  BookOpen,
  Building2,
  CircleParking,
  CloudRain,
  Droplets,
  Footprints,
  Gauge,
  GitFork,
  IdCard,
  LifeBuoy,
  Milestone,
  Moon,
  Mountain,
  Ruler,
  Scale,
  ShieldCheck,
  Siren,
  Smile,
  TrafficCone,
  Truck,
  Wine,
  Wrench,
};

export function categoryIcon(name: string | null | undefined): LucideIcon {
  return (name && ICONS[name]) || TrafficCone;
}

export function CategoryIcon({
  name,
  className,
}: {
  name: string | null | undefined;
  className?: string;
}) {
  const Icon = categoryIcon(name);
  return <Icon className={className ?? "h-6 w-6 text-primary"} aria-hidden />;
}
