"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ResetPasswordPage() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = new FormData(event.currentTarget);

    await fetch("/api/auth/forget-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), redirectTo: "/reset-password" })
    });

    setPending(false);
    setSent(true);
  }

  return (
    <main className="auth-page">
      <form className="auth-panel" onSubmit={onSubmit}>
        <h1>Recuperar senha</h1>
        <p>Enviaremos um link de redefinicao. No ambiente local, o link aparece no console.</p>
        <div className="field-stack">
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

