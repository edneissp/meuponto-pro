import { useState } from "react";

export default function ChatBot() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input) return;

    const userMessage = { role: "user", text: input };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const response = await fetch("https://SEU-LINK-RAILWAY/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: input
        })
      });

      const data = await response.json();

      const botMessage = { role: "bot", text: data.reply };

      setMessages((prev) => [...prev, botMessage]);

    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, width: 300 }}>
      <div style={{ background: "#fff", padding: 10, borderRadius: 10 }}>
        <div style={{ maxHeight: 200, overflowY: "auto" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ margin: "5px 0" }}>
              <b>{msg.role === "user" ? "Você" : "Bot"}:</b> {msg.text}
            </div>
          ))}
        </div>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua mensagem..."
          style={{ width: "100%" }}
        />

        <button onClick={sendMessage} style={{ width: "100%" }}>
          Enviar
        </button>
      </div>
    </div>
  );
                 }
