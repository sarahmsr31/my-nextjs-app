"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Look for student where email matches and ID starts with the code
    const { data: rows, error: dbError } = await supabase
      .from("students")
      .select("*")
      .eq("parent_email", email)
      .filter("id", "ilike", `${code.trim().toLowerCase()}%`)
      .limit(1);

    const data = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (data) {
      router.push(`/dashboard?student_id=${data.id}`);
    } else {
      setError("We couldn't find a student with that email and code. Please check and try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "80px auto", padding: "20px", fontFamily: "sans-serif" }}>
       <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ width: '100px', height: '100px', background: '#eee', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
          LOGO
        </div>
      </div>
      <div style={{ background: "#fff", padding: "30px", borderRadius: "18px", border: "1px solid #e7e2ef", boxShadow: "0 8px 24px rgba(0,0,0,0.06)" }}>
        <h2 style={{ textAlign: "center", color: "#2b1f38" }}>Student Login</h2>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "20px" }}>
          <input type="email" placeholder="Parent Email" onChange={(e) => setEmail(e.target.value)} required style={{ padding: "12px", borderRadius: "10px", border: "1px solid #ddd" }} />
          <input type="text" placeholder="8-Character Access Code" onChange={(e) => setCode(e.target.value)} required style={{ padding: "12px", borderRadius: "10px", border: "1px solid #ddd" }} />
          <button type="submit" disabled={loading} style={{ padding: "14px", background: "#E76F51", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}>
            {loading ? "Checking..." : "Login to Dashboard"}
          </button>
          {error && <p style={{ color: "#b42318", fontSize: "14px", textAlign: "center" }}>{error}</p>}
        </form>
      </div>
    </div>
  );
}