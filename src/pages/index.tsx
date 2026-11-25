import { Landing } from "@/components/landing/Landing";
import { withPageAuth } from "@/lib/ssr";

// Si ya hay sesión, el servidor redirige directo al tablero (sin pantalla de carga intermedia).
export const getServerSideProps = withPageAuth("guest");

export default function Home() {
    return <Landing />;
}
