import * as React from "react";
import { formatMoney } from "@/lib/format";

/** Cuenta animada hacia el nuevo valor (respeta "reducir movimiento"). */
export function AnimatedMoney({ value, duration = 700, className }: { value: number; duration?: number; className?: string }) {
    const [display, setDisplay] = React.useState(value);
    const fromRef = React.useRef(value);

    React.useEffect(() => {
        const from = fromRef.current;
        const to = value;
        if (from === to) return;

        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        if (reduce) {
            fromRef.current = to;
            setDisplay(to);
            return;
        }

        let frame = 0;
        const start = performance.now();
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            const current = Math.round(from + (to - from) * eased);
            setDisplay(current);
            if (t < 1) frame = requestAnimationFrame(tick);
            else fromRef.current = to;
        };
        frame = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(frame);
            fromRef.current = to;
        };
    }, [value, duration]);

    return <span className={className}>{formatMoney(display)}</span>;
}
