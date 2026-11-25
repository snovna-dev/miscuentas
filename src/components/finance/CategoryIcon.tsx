import {
    Car,
    CreditCard,
    Fuel,
    GraduationCap,
    HeartPulse,
    Home,
    PawPrint,
    PiggyBank,
    Plane,
    Popcorn,
    Shapes,
    Shield,
    ShoppingBag,
    ShoppingCart,
    Tv,
    UtensilsCrossed,
    Users,
    Wrench,
    Zap,
    type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const RULES: [RegExp, LucideIcon, string][] = [
    [/vivienda|arriendo|alquiler/, Home, "bg-chart-1/14 text-chart-1"],
    [/servicio|energ|agua|internet|luz/, Zap, "bg-chart-3/20 text-warning-foreground"],
    [/vehic|gasolina|soat/, Fuel, "bg-chart-2/14 text-chart-2"],
    [/transporte/, Car, "bg-chart-2/14 text-chart-2"],
    [/educa|matr/, GraduationCap, "bg-chart-4/14 text-chart-4"],
    [/seguro/, Shield, "bg-info/14 text-info"],
    [/deuda|cr[eé]dito|pr[eé]stamo/, CreditCard, "bg-chart-5/14 text-chart-5"],
    [/suscrip|plataforma/, Tv, "bg-chart-4/14 text-chart-4"],
    [/salud|medic/, HeartPulse, "bg-chart-5/14 text-chart-5"],
    [/aliment|comida|domicilio/, UtensilsCrossed, "bg-chart-3/20 text-warning-foreground"],
    [/mercado/, ShoppingCart, "bg-chart-6/16 text-chart-6"],
    [/compra|ropa/, ShoppingBag, "bg-chart-4/14 text-chart-4"],
    [/entreten|cine|evento/, Popcorn, "bg-chart-5/14 text-chart-5"],
    [/hogar|repara/, Wrench, "bg-chart-2/14 text-chart-2"],
    [/familia|regalo/, Users, "bg-chart-1/14 text-chart-1"],
    [/mascota|veterin/, PawPrint, "bg-chart-6/16 text-chart-6"],
    [/viaje|hosped/, Plane, "bg-info/14 text-info"],
    [/ahorro/, PiggyBank, "bg-chart-1/14 text-chart-1"],
];

function normalize(text: string) {
    return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function categoryVisual(name: string | null | undefined) {
    const key = normalize(name ?? "");
    for (const [pattern, icon, tone] of RULES) {
        if (pattern.test(key)) return { icon, tone };
    }
    return { icon: Shapes, tone: "bg-muted text-muted-foreground" };
}

export function CategoryIcon({ name, className, size = "md" }: { name: string | null | undefined; className?: string; size?: "sm" | "md" | "lg" }) {
    const { icon: Icon, tone } = categoryVisual(name);
    const sizes = { sm: "size-8 rounded-lg [&_svg]:size-4", md: "size-10 rounded-xl [&_svg]:size-[18px]", lg: "size-12 rounded-2xl [&_svg]:size-5" };
    return (
        <span className={cn("flex shrink-0 items-center justify-center", sizes[size], tone, className)} aria-hidden="true">
            <Icon />
        </span>
    );
}
