/**
 * Interactive chat interface for asking questions about the video critique.
 * Connects to Gemini AI via the GeminiContext to provide context-aware responses.
 * Auto-scrolls to latest messages and handles loading states.
 * @module components/ChatInterface
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { ChatMessage, ChatRole } from '../types';
import { useGemini } from '../contexts/GeminiContext';

/**
 * Props for the ChatInterface component.
 */
interface Props {
  /** Optional array of initial chat messages to display */
  initialMessages?: ChatMessage[];
}

/**
 * Chat interface component for interactive Q&A about video critique.
 * Displays conversation history and allows users to ask follow-up questions.
 *
 * @param {Props} props - Component props
 * @returns {JSX.Element} Rendered chat interface
 *
 * @example
 * <ChatInterface initialMessages={savedChatHistory} />
 */
const ChatInterface: React.FC<Props> = ({ initialMessages = [] }) => {
  const { sendMessage } = useGemini();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      role: ChatRole.USER,
      text: input,
      id: Date.now().toString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const responseText = await sendMessage(input);
      const botMsg: ChatMessage = {
        role: ChatRole.MODEL,
        text: responseText,
        id: (Date.now() + 1).toString(),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        role: ChatRole.MODEL,
        text: "I'm having trouble connecting to the creative director. Please try again.",
        id: (Date.now() + 1).toString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-slate-800 p-4 border-b border-slate-700 flex items-center gap-3">
        <div className="p-2 bg-indigo-500/20 rounded-lg">
          <Sparkles className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-100">Creative Assistant</h3>
          <p className="text-xs text-slate-400">Context-aware Director AI</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 mt-10">
            <p>I've analyzed your video.</p>
            <p className="text-sm mt-2">Ask me about specific shots, lighting fixes, or pacing!</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex gap-3 ${msg.role === ChatRole.USER ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === ChatRole.USER ? 'bg-slate-700' : 'bg-indigo-600'
            }`}>
              {msg.role === ChatRole.USER ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === ChatRole.USER 
                ? 'bg-slate-700 text-slate-100 rounded-tr-sm' 
                : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <Bot size={16} />
            </div>
            <div className="bg-slate-800 border border-slate-700 p-3 rounded-2xl rounded-tl-sm">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-800 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask how to fix the lighting at 0:45..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
          <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
