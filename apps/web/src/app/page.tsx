import { redirect } from "next/navigation";

export default async function HomePage() {
  // D-03: a rota raiz abre sempre o workspace (logado ou deslogado).
  // Deslogado, o workspace renderiza um preview travado (sem redirect para /sign-in).
  redirect("/workspace");
}
