"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { LogIn } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function seConnecter(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Email ou mot de passe incorrect.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "linear-gradient(160deg, #182521 0%, #1F3229 100%)" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 360, boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 12, letterSpacing: 1.2, color: "#8A968F", textTransform: "uppercase", fontWeight: 600 }}>Appart 4B</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#182521", marginTop: 4 }}>Connexion</div>
        </div>
        <form onSubmit={seConnecter} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, color: "#5B6B62", fontWeight: 600 }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ border: "1px solid #E1E5E2", borderRadius: 10, padding: 11, fontSize: 14 }} />
          <label style={{ fontSize: 12, color: "#5B6B62", fontWeight: 600 }}>Mot de passe</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ border: "1px solid #E1E5E2", borderRadius: 10, padding: 11, fontSize: 14 }} />
          {error && <div style={{ fontSize: 12.5, color: "#C0463C" }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#2F6F63", color: "#fff", border: "none", borderRadius: 10, padding: 13, fontWeight: 700, fontSize: 14, marginTop: 8 }}>
            <LogIn size={16} /> {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
