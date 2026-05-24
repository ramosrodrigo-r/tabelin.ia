"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);

    await fetch("/api/auth/forget-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), redirectTo: "/reset-password" })
    });

    setPending(false);
    setSent(true);
  }

  async function onResetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password: form.get("password") })
    });

    setPending(false);

    if (!response.ok) {
      setError("O link expirou ou ja foi usado.");
      return;
    }

    setDone(true);
  }

  if (token) {
    return (
      <main className="auth-page">
        <form className="auth-panel" onSubmit={onResetSubmit}>
          <h1>Definir nova senha</h1>
          <p>Escolha uma nova senha para voltar ao workspace.</p>
          <div className="field-stack">
            {done ? <div className="form-error">Senha alterada. Voce ja pode entrar.</div> : null}
            {error ? <div className="form-error">{error}</div> : null}
            <div className="field">
              <label htmlFor="password">Nova senha</label>
              <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            <button className="primary-button" type="submit" disabled={pending || done}>
              {pending ? "Salvando..." : "Salvar senha"}
            </button>
            <Link className="secondary-link" href="/sign-in">
              Voltar para entrar
            </Link>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <form className="auth-panel" onSubmit={onRequestSubmit}>
        <h1>Recuperar senha</h1>
        <p>Enviaremos um link de redefinicao. No ambiente local, o link aparece no console.</p>
        <div className="field-stack">
          {error ? <div className="form-error">{error}</div> : null}
          {sent ? <div className="form-error">Se o email existir, o link de redefinicao foi enviado.</div> : null}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <button className="primary-button" type="submit" disabled={pending}>
            {pending ? "Enviando..." : "Enviar link"}
          </button>
          <Link className="secondary-link" href="/sign-in">
            Voltar para entrar
          </Link>
        </div>
      </form>
    </main>
  );
}
