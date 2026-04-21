import { useState } from "react";

export default function ChatBot() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input) return;

    const userMessage = { role: "user", text: input };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("https://meuponto-pro-production.up.railway.app/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: input
        })
      });

      const data = await response.json();

      const botMessage = {
        role: "bot",
        text: data.reply || "Erro ao responder"
      };

      setMessages((prev) => [...prev, botMessage]);

    } catch (error) {
      console.error(error);

      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Erro ao conectar com servidor." }
      ]);
    }

    setLoading(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        width: 320,
        zIndex: 9999
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 10,
          borderRadius: 10,
          boxShadow: "0 0 10px rgba(0,0,0,0.2)"
        }}
      >
        <div
          style={{
            maxHeight: 250,
            overflowY: "auto",
            marginBottom: 10
          }}
        >
          {messages.map((msg, i) => (
            <div key={i} style={{ margin: "5px 0" }}>
              <b>{msg.role === "user" ? "Você" : "SouEFI"}:</b> {msg.text}
            </div>
          ))}

          {loading && <div>SouEFI está digitando...</div>}
        </div>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua mensagem..."
          style={{
            width: "100%",
            marginBottom: 5,
            padding: 5
          }}
        />

        <button
          onClick={sendMessage}
          style={{
            width: "100%",
            padding: 8,
            background: "#16a34a",
            color: "#fff",
            border: "none",
            borderRadius: 5
          }}
        >
          Enviar
        </button>
      </div>
    </div>
  );
      }
