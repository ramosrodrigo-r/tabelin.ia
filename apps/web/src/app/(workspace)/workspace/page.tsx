import { redirect } from "next/navigation";

import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { FormulaTool } from "@/features/formula/formula-tool";
import { getCurrentUser } from "@/server/auth/session";

export default async function WorkspacePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="workspace-layout">
      <Sidebar />
      <div className="workspace-main">
        <Topbar user={user} />
        <main className="workspace-content">
          <section className="workspace-heading">
            <div>
              <h1>Workspace de formulas</h1>
              <p>Descreva a tarefa em portugues e receba uma formula pronta para copiar.</p>
            </div>
          </section>
          <FormulaTool />
        </main>
      </div>
    </div>
  );
}
