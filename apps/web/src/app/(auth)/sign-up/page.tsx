"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password")
      })
    });

    setPending(false);

    if (!response.ok) {
      setError("Nao foi possivel criar sua conta.");
      return;
    }

    router.push("/workspace");
  }

  return (
    <main className="auth-page">
      <form className="auth-panel" onSubmit={onSubmit}>
        <h1>Criar conta</h1>
        <p>Comece com formulas localizadas para o seu time.</p>
        <div className="field-stack">
          {error ? <div className="form-error">{error}</div> : null}
          <div className="field">
            <label htmlFor="name">Nome</label>
            <input id="name" name="name" type="text" autoComplete="name" required />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          </div>
          <button className="primary-button" type="submit" disabled={pending}>
            {pending ? "Criando..." : "Criar conta"}
          </button>
          <Link className="secondary-link" href="/sign-in">
            Ja tenho conta
          </Link>
        </div>
      </form>
    </main>
  );
}

