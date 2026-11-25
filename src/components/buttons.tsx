import * as React from "react";
import Link, { type LinkProps } from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

const buttonVariants = cva(
    [
        "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium",
        "transition-[background-color,color,box-shadow,transform,opacity] duration-200 ease-out",
        "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-55",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
        "[&_svg]:size-4 [&_svg]:shrink-0",
    ].join(" "),
    {
        variants: {
            variant: {
                default:
                    "bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_color-mix(in_oklch,var(--primary)_70%,transparent)] hover:brightness-110",
                secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
                outline: "border border-border bg-card text-foreground hover:bg-muted",
                ghost: "text-foreground hover:bg-muted",
                destructive: "bg-destructive text-destructive-foreground hover:brightness-110",
                soft: "bg-primary/10 text-primary hover:bg-primary/15",
                link: "rounded-md px-0 text-primary underline-offset-4 hover:underline",
                // Alias de compatibilidad con el diseño anterior
                transparent: "border border-current/25 bg-transparent hover:bg-foreground/5",
                color: "bg-secondary text-secondary-foreground hover:bg-accent",
                icon: "bg-muted text-foreground hover:bg-accent",
            },
            size: {
                default: "h-10 px-4",
                sm: "h-8 rounded-lg px-3 text-xs",
                lg: "h-12 px-6 text-base",
                xl: "h-14 rounded-2xl px-8 text-base",
                icon: "size-10",
                "icon-sm": "size-8 rounded-lg",
                "icon-lg": "size-12",
            },
            block: {
                true: "w-full",
                false: "",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
            block: false,
        },
    }
);

type CommonProps = VariantProps<typeof buttonVariants> & {
    className?: string;
    children?: React.ReactNode;
    /** Muestra un spinner y bloquea el botón (evita envíos dobles). */
    loading?: boolean;
    loadingText?: string;
};

type ButtonAsButton = CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: never };
type ButtonAsAnchor = CommonProps & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & Pick<LinkProps, "href">;

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(function Button(props, ref) {
    const { className, variant, size, block, children, loading = false, loadingText, ...rest } = props;
    const classes = cn(buttonVariants({ variant, size, block }), className);

    const content = loading ? (
        <>
            <Spinner className="size-4" />
            <span>{loadingText ?? children}</span>
        </>
    ) : (
        children
    );

    if ("href" in rest && rest.href !== undefined) {
        const { href, ...anchorProps } = rest as ButtonAsAnchor;
        return (
            <Link ref={ref as React.Ref<HTMLAnchorElement>} href={href} data-slot="button" className={classes} {...anchorProps}>
                {content}
            </Link>
        );
    }

    const buttonProps = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
    return (
        <button
            ref={ref as React.Ref<HTMLButtonElement>}
            data-slot="button"
            className={classes}
            {...buttonProps}
            type={buttonProps.type ?? "button"}
            disabled={buttonProps.disabled || loading}
            aria-busy={loading || undefined}
        >
            {content}
        </button>
    );
});

export { Button, buttonVariants };
