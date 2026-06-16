"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type Mode = "signin" | "signup";

/**
 * Modal de autenticação não-dispensável (D-02/D-04/D-05).
 *
 * Reaproveita as MESMAS rotas de auth existentes (T-dw3-03): POST para
 * /api/auth/sign-in/email e /api/auth/sign-up/email. Não há nova lógica de
 * autenticação — apenas chama as rotas que já fazem validateAuthPostOrigin e
 * setam o cookie HMAC httpOnly.
 *
 * Não-dispensável: sem botão de fechar, sem fechar por overlay, sem fechar no ESC.
 * Em sucesso (D-05), chama router.refresh() para revalidar os server components,
 * que então leem a sessão (cookie já setado) e param de renderizar o gate.
 */
export function AuthGateModal() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const endpoint =
      mode === "signin" ? "/api/auth/sign-in/email" : "/api/auth/sign-up/email";
    const body =
      mode === "signin"
        ? { email: form.get("email"), password: form.get("password") }
        : {
            name: form.get("name"),
            email: form.get("email"),
            password: form.get("password"),
          };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    setPending(false);

    if (!response.ok) {
      setError(
        mode === "signin"
          ? "Nao foi possivel entrar. Confira email e senha."
          : "Nao foi possivel criar sua conta."
      );
      return;
    }

    // D-05: revalida os server components; a sessão (cookie já setado pela rota)
    // passa isAuthenticated=true ao AuthGate e o gate deixa de renderizar.
    router.refresh();
  }

  return (
    <div
      className="auth-gate-modal auth-panel"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "signin" ? "Entrar no Tabelin.IA" : "Criar conta"}
    >
      <h1>{mode === "signin" ? "Entrar no Tabelin.IA" : "Criar conta"}</h1>
      <p>
        {mode === "signin"
          ? "Acesse seu workspace para trabalhar com seus dados reais."
          : "Comece com formulas localizadas para o seu time."}
      </p>
      <form className="field-stack" onSubmit={onSubmit}>
        {error ? <div className="form-error">{error}</div> : null}
        {mode === "signup" ? (
          <div className="field">
            <label htmlFor="auth-gate-name">Nome</label>
            <input
              id="auth-gate-name"
              name="name"
              type="text"
              autoComplete="name"
              required
            />
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="auth-gate-email">Email</label>
          <input
            id="auth-gate-email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="auth-gate-password">Senha</label>
          <input
            id="auth-gate-password"
            name="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={mode === "signup" ? 8 : undefined}
            required
          />
        </div>
        <button className="primary-button" type="submit" disabled={pending}>
          {pending
            ? mode === "signin"
              ? "Entrando..."
              : "Criando..."
            : mode === "signin"
              ? "Entrar"
              : "Criar conta"}
        </button>
        <button
          className="secondary-link"
          type="button"
          style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}
          onClick={() => {
            setError("");
            setMode(mode === "signin" ? "signup" : "signin");
          }}
        >
          {mode === "signin" ? "Criar conta" : "Ja tenho conta"}
        </button>
      </form>
    </div>
  );
}
