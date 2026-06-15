import { useEffect, useRef, useState } from 'react';
import { Radio, Send, Sparkles } from 'lucide-react';

export default function LiveChat({ chatMessages, onSendMessage }) {
  const [text, setText] = useState('');
  const chatEndRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text);
    setText('');
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const getMessageClass = (msg) => {
    if (msg.user === 'Sistema') return 'chat-sys-msg';
    if (msg.user.startsWith('Tú')) return 'chat-user-msg';
    return 'chat-coworker-msg';
  };

  return (
    <div className="chat-wrapper">
      <div className="chat-live-strip">
        <div>
          <span className="chat-live-eyebrow"><Radio size={13} /> En vivo</span>
          <strong>Los goles reales aparecen aquí automáticamente</strong>
        </div>
        <span className="chat-ai-badge"><Sparkles size={13} /> Mundial 26</span>
      </div>

      <div className="chat-messages-container">
        {chatMessages.map((msg) => {
          const isSystem = msg.user === 'Sistema';
          const isUser = msg.user.startsWith('Tú');
          const isHighlight = msg.highlight;
          
          return (
            <div 
              key={msg.id} 
              className={`chat-message-bubble-wrapper ${isSystem ? 'system-wrapper' : isUser ? 'user-wrapper' : 'coworker-wrapper'}`}
            >
              <div className={`chat-message-bubble ${getMessageClass(msg)} ${isHighlight ? 'goal-highlight' : ''}`}>
                {!isSystem && (
                  <div className="chat-bubble-header">
                    <span className="chat-sender-name">{msg.user}</span>
                    <span className="chat-timestamp">{msg.time}</span>
                  </div>
                )}
                <div className="chat-bubble-body">
                  {isSystem && <span className="system-tag">Info</span>}
                  <span className="chat-message-text">{msg.text}</span>
                </div>
                {isSystem && (
                  <div className="chat-system-footer">
                    <span>{msg.time}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-compose-area">
        <input 
          type="text" 
          className="chat-compose-input"
          placeholder="Comenta con la oficina..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="chat-submit-btn" title="Enviar comentario">
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
