import { Bot, LoaderCircle, SendHorizonal, User2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "../utils/notify";
import aiService from "../services/aiService";

const starterMessages = [
  {
    role: "assistant",
    content:
      "Ask anything about this document. I can help with summaries, concept explanations, and revision-friendly answers.",
  },
];

const ChatInterface = ({ documentId }) => {
  const [messages, setMessages] = useState(starterMessages);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await aiService.getChatHistory(documentId);
        if (history.length > 0) {
          setMessages(history);
        } else {
          setMessages(starterMessages);
        }
      } catch {
        setMessages(starterMessages);
      }
    };

    if (documentId) {
      loadHistory();
    }
  }, [documentId]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!question.trim()) return;

    const nextQuestion = question.trim();
    setMessages((prev) => [...prev, { role: "user", content: nextQuestion }]);
    setQuestion("");

    try {
      setLoading(true);
      const response = await aiService.askQuestion(documentId, nextQuestion);
      setMessages((prev) => [...prev, { role: "assistant", content: response.answer }]);
    } catch (error) {
      toast.error(error.message || "Failed to get an answer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-sky-700">AI Chat</p>
          <h3 className="text-xl font-semibold text-slate-950">Context-aware Q&A with your document</h3>
        </div>
        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
          Gemini-style workspace
        </span>
      </div>

      <div
        ref={messagesContainerRef}
        className="max-h-[420px] space-y-4 overflow-y-auto rounded-3xl bg-slate-50 p-4"
      >
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "assistant" ? (
              <div className="mt-1 rounded-2xl bg-slate-900 p-2 text-white">
                <Bot size={16} />
              </div>
            ) : null}
            <div
              className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-7 shadow-sm ${
                message.role === "user"
                  ? "bg-emerald-500 text-white"
                  : "border border-slate-200 bg-white text-slate-700"
              }`}
            >
              {message.content}
            </div>
            {message.role === "user" ? (
              <div className="mt-1 rounded-2xl bg-emerald-100 p-2 text-emerald-700">
                <User2 size={16} />
              </div>
            ) : null}
          </div>
        ))}

        {loading ? (
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <LoaderCircle size={16} className="animate-spin" />
            Thinking through your question...
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-3">
        <input
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask a question about this document..."
          className="h-12 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          <SendHorizonal size={18} />
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;
