"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password")
      })
    });

    setPending(false);

    if (!response.ok) {
      setError("Nao foi possivel entrar. Confira email e senha.");
      return;
    }

    router.push("/workspace");
  }

  return (
    <main className="auth-page">
      <form className="auth-panel" onSubmit={onSubmit}>
        <h1>Entrar no Tabelin.IA</h1>
        <p>Acesse seu workspace de formulas e automacoes.</p>
        <div className="field-stack">
          {error ? <div className="form-error">{error}</div> : null}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <button className="primary-button" type="submit" disabled={pending}>
            {pending ? "Entrando..." : "Entrar"}
          </button>
          <Link className="secondary-link" href="/reset-password">
            Esqueci minha senha
          </Link>
          <Link className="secondary-link" href="/sign-up">
            Criar conta
          </Link>
        </div>
      </form>
    </main>
  );
}

