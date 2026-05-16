import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const SYSTEM_MSG = {
  role: "assistant",
  content: `Olá! 👋 Sou seu Gestor de Tráfego integrado ao Meta Ads.

Com a integração ativa, posso:
📣 **Criar campanhas** completas na sua conta
🎯 **Segmentar públicos** por idade, gênero, interesses e localização  
🎨 **Criar anúncios** com copy otimizada
📊 **Listar e analisar** suas campanhas ativas
⏸️ **Pausar ou ativar** campanhas

É só me dizer o que você quer — em português mesmo!

**Exemplo:** _"Cria uma campanha de leads para meu curso de inglês, orçamento R$30/dia, público 18 a 35 anos, todo Brasil"_`,
};

function Markdown({ text }) {
  const html = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.*?)_/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 16,
      gap: 10,
      alignItems: "flex-start",
      animation: "fadeUp 0.3s ease",
    }}>
      {!isUser && (
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "linear-gradient(135deg, #0866FF, #00C6FF)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0,
        }}>🎯</div>
      )}
      <div style={{
        maxWidth: "76%",
        background: isUser ? "linear-gradient(135deg, #0866FF, #0052CC)" : "#fff",
        color: isUser ? "#fff" : "#1a1a2e",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        padding: "12px 16px",
        fontSize: 14,
        lineHeight: 1.65,
        boxShadow: isUser ? "0 4px 16px rgba(8,102,255,0.25)" : "0 2px 12px rgba(0,0,0,0.08)",
      }}>
        <Markdown text={msg.content} />
        {msg.resultado?.campanhas && (
          <CampanhasCard campanhas={msg.resultado.campanhas} />
        )}
        {msg.resultado?.id && (
          <div style={{
            marginTop: 10, background: "rgba(34,197,94,0.1)",
            border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: 8, padding: "8px 12px",
            fontSize: 12, color: "#16a34a", fontWeight: 600,
          }}>
            ✅ Criado com sucesso! ID: {msg.resultado.id}
          </div>
        )}
      </div>
      {isUser && (
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "linear-gradient(135deg, #667eea, #764ba2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0,
        }}>👤</div>
      )}
    </div>
  );
}

function CampanhasCard({ campanhas }) {
  if (!campanhas?.length) return (
    <div style={{ marginTop: 10, fontSize: 13, color: "#6b7db3" }}>
      Nenhuma campanha encontrada.
    </div>
  );
  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      {campanhas.map(c => (
        <div key={c.id} style={{
          background: "#f8faff", borderRadius: 10,
          padding: "10px 14px", border: "1px solid #e0e7ff",
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#1a1a2e" }}>{c.name}</div>
          <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
            <Badge label="Status" value={c.status} color={c.status === "ACTIVE" ? "#22c55e" : "#f59e0b"} />
            <Badge label="Objetivo" value={c.objective?.replace("OUTCOME_", "")} color="#0866FF" />
            {c.insights?.data?.[0] && <>
              <Badge label="Gasto" value={`R$${parseFloat(c.insights.data[0].spend || 0).toFixed(2)}`} color="#7c3aed" />
              <Badge label="CTR" value={`${parseFloat(c.insights.data[0].ctr || 0).toFixed(2)}%`} color="#059669" />
            </>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Badge({ label, value, color }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600,
      background: `${color}15`, color,
      padding: "3px 8px", borderRadius: 6,
    }}>
      {label}: {value}
    </span>
  );
}

function ContaSeletor({ contas, contaSelecionada, onChange }) {
  return (
    <select
      value={contaSelecionada}
      onChange={e => onChange(e.target.value)}
      style={{
        background: "#f0f4ff", border: "1px solid #e0e7ff",
        borderRadius: 8, padding: "6px 12px",
        fontSize: 12, color: "#374151", fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {contas.map(c => (
        <option key={c.id} value={c.id.replace("act_", "")}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

export default function App() {
  const [status, setStatus] = useState({ logado: false, contas: [] });
  const [contaSelecionada, setContaSelecionada] = useState("");
  const [messages, setMessages] = useState([SYSTEM_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/auth/status`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        setStatus(data);
        if (data.contas?.[0]) {
          setContaSelecionada(data.contas[0].id.replace("act_", ""));
        }
      })
      .catch(() => setStatus({ logado: false, contas: [] }))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const logout = async () => {
    await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
    setStatus({ logado: false, contas: [] });
    setMessages([SYSTEM_MSG]);
  };

  const enviar = async () => {
    const texto = input.trim();
    if (!texto || loading) return;
    setInput("");

    const novasMensagens = [...messages, { role: "user", content: texto }];
    setMessages(novasMensagens);
    setLoading(true);

    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagens: novasMensagens.filter(m => m.role !== "system").map(m => ({
            role: m.role,
            content: m.content,
          })),
          contaId: contaSelecionada,
        }),
      });

      const data = await res.json();
      
      // Monta a mensagem de resposta
      let conteudo = data.mensagem || "Pronto!";
      if (data.resultado?.id) {
        conteudo += `\n\n✅ Criado com sucesso! ID: ${data.resultado.id}`;
      }
      if (data.resultado?.mensagem) {
        conteudo += `\n${data.resultado.mensagem}`;
      }

      setMessages([...novasMensagens, {
        role: "assistant",
        content: conteudo,
        resultado: data.resultado,
      }]);
    } catch (err) {
      setMessages([...novasMensagens, {
        role: "assistant",
        content: "❌ Erro de conexão com o servidor. Verifique se o backend está online.",
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  if (carregando) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f0f4ff" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
        <div style={{ color: "#6b7db3", fontWeight: 600 }}>Carregando...</div>
      </div>
    </div>
  );

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      background: "#f0f4ff",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes bounce { 0%,80%,100% { transform:scale(0.7); opacity:0.5; } 40% { transform:scale(1); opacity:1; } }
        * { box-sizing: border-box; }
        textarea { resize: none; font-family: inherit; }
        textarea:focus, button:focus { outline: none; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #c5cfe0; border-radius: 10px; }
      `}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0a0f2c, #0f1a4a)",
        padding: "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg, #0866FF, #00C6FF)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20,
          }}>🚀</div>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, color: "#fff" }}>
              Gestor de Tráfego IA
            </div>
            <div style={{ fontSize: 11, color: "#6b7db3" }}>Meta Ads · Integrado</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {status.logado ? (
            <>
              {status.contas?.length > 0 && (
                <ContaSeletor
                  contas={status.contas}
                  contaSelecionada={contaSelecionada}
                  onChange={setContaSelecionada}
                />
              )}
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
                borderRadius: 20, padding: "5px 12px",
                fontSize: 12, color: "#4ade80", fontWeight: 600,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                Meta conectado
              </div>
              <button onClick={logout} style={{
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, padding: "6px 14px",
                fontSize: 12, color: "#8fa3d4", cursor: "pointer", fontWeight: 500,
              }}>
                Sair
              </button>
            </>
          ) : (
            <a href={`${API}/auth/meta`} style={{
              background: "linear-gradient(135deg, #0866FF, #0052CC)",
              color: "#fff", padding: "9px 20px", borderRadius: 10,
              fontSize: 13, fontWeight: 700, textDecoration: "none",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>f</span>
              Conectar com Facebook
            </a>
          )}
        </div>
      </div>

      {!status.logado && (
        <div style={{
          background: "linear-gradient(135deg, #fef3c7, #fef9e7)",
          border: "1px solid #fde68a",
          padding: "12px 24px",
          display: "flex", alignItems: "center", gap: 10,
          fontSize: 13, color: "#92400e",
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span>
            <strong>Conecte sua conta do Facebook</strong> para criar campanhas. Sem a conexão, posso apenas responder perguntas sobre Meta Ads.
          </span>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {loading && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg, #0866FF, #00C6FF)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
            }}>🎯</div>
            <div style={{ background: "#fff", borderRadius: "18px 18px 18px 4px", padding: "14px 18px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 8, height: 8, borderRadius: "50%", background: "#0866FF",
                  display: "inline-block", margin: "0 3px",
                  animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{
        background: "#fff", borderTop: "1px solid #e8edf8",
        padding: "16px 24px", boxShadow: "0 -4px 16px rgba(0,0,0,0.04)",
      }}>
        <div style={{
          display: "flex", gap: 12, alignItems: "flex-end",
          background: "#f6f8ff", border: "2px solid #e0e7ff",
          borderRadius: 16, padding: "10px 10px 10px 18px",
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            placeholder={status.logado
              ? "Ex: Cria uma campanha de leads, R$50/dia, público 25-40 anos..."
              : "Faça uma pergunta sobre Meta Ads..."}
            rows={1}
            style={{
              flex: 1, background: "transparent", border: "none",
              fontSize: 14, color: "#1a1a2e", lineHeight: 1.6,
              maxHeight: 120, overflowY: "auto", padding: "2px 0",
            }}
            onInput={e => {
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={enviar}
            disabled={!input.trim() || loading}
            style={{
              width: 42, height: 42, borderRadius: 12, border: "none",
              background: input.trim() && !loading ? "linear-gradient(135deg, #0866FF, #0052CC)" : "#e0e7ff",
              color: input.trim() && !loading ? "#fff" : "#a5b4d0",
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, flexShrink: 0,
            }}
          >↑</button>
        </div>
        <div style={{ fontSize: 11, color: "#b0bcd4", textAlign: "center", marginTop: 8 }}>
          Enter para enviar · Shift+Enter para nova linha
        </div>
      </div>
    </div>
  );
}
