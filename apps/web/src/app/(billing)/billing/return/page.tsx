import { getCurrentUser } from "@/server/auth/session";
import { getUserEntitlement } from "@/server/billing/entitlements";
import { redirect } from "next/navigation";

type SearchParams = Promise<{
  status?: string;
  external_reference?: string;
  payment_id?: string;
}>;

export default async function BillingReturnPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const params = await searchParams;
  const entitlement = await getUserEntitlement(user.id);

  const isPro = entitlement.plan === "pro" && entitlement.status === "active";

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="max-w-md w-full bg-white rounded-lg border border-neutral-200 p-8 text-center">
        {isPro ? (
          <>
            <div className="mb-4 text-green-600 text-5xl">✓</div>
            <h1 className="text-2xl font-semibold text-neutral-900 mb-2">Pagamento confirmado</h1>
            <p className="text-neutral-600 mb-6">
              Sua assinatura Pro foi ativada. Você já pode aproveitar acesso ilimitado a todas as
              ferramentas.
            </p>
            <a
              href="/workspace"
              className="inline-block px-6 py-3 bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors"
            >
              Voltar para o workspace
            </a>
          </>
        ) : (
          <>
            <div className="mb-4 text-yellow-600 text-5xl">⏳</div>
            <h1 className="text-2xl font-semibold text-neutral-900 mb-2">Processando pagamento</h1>
            <p className="text-neutral-600 mb-6">
              Seu pagamento está sendo confirmado. Isso pode levar alguns instantes. Aguarde ou
              retorne ao workspace — você receberá acesso Pro assim que a confirmação for concluída.
            </p>
            <a
              href="/workspace"
              className="inline-block px-6 py-3 bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors"
            >
              Voltar para o workspace
            </a>
          </>
        )}

        {params.status && (
          <p className="mt-4 text-xs text-neutral-400">Status do provedor: {params.status}</p>
        )}
      </div>
    </div>
  );
}
