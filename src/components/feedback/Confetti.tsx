import * as React from "react";

const COLORS = ["#34D399", "#0D9488", "#FCD34D", "#38BDF8", "#A78BFA", "#FB7185"];

type Piece = { id: number; left: number; x: number; y: number; r: number; delay: number; color: string };

function makePieces(count: number): Piece[] {
    return Array.from({ length: count }, (_, id) => ({
        id,
        left: 40 + Math.random() * 20,
        x: (Math.random() - 0.5) * 520,
        y: 120 + Math.random() * 360,
        r: (Math.random() - 0.5) * 900,
        delay: Math.random() * 180,
        color: COLORS[id % COLORS.length],
    }));
}

/** Ráfaga de confeti con CSS puro. Cambia `burstKey` para dispararla de nuevo. */
export function Confetti({ burstKey, count = 36 }: { burstKey: number; count?: number }) {
    const [pieces, setPieces] = React.useState<Piece[]>([]);

    React.useEffect(() => {
        if (!burstKey) return;
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
        setPieces(makePieces(count));
        const timer = window.setTimeout(() => setPieces([]), 1800);
        return () => window.clearTimeout(timer);
    }, [burstKey, count]);

    if (pieces.length === 0) return null;

    return (
        <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-1/3 z-[95] h-0">
            {pieces.map((piece) => (
                <span
                    key={`${burstKey}-${piece.id}`}
                    className="confetti-piece"
                    style={
                        {
                            left: `${piece.left}%`,
                            background: piece.color,
                            animationDelay: `${piece.delay}ms`,
                            "--x": `${piece.x}px`,
                            "--y": `${piece.y}px`,
                            "--r": `${piece.r}deg`,
                        } as React.CSSProperties
                    }
                />
            ))}
        </div>
    );
}
