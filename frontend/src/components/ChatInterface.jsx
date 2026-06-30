import React, { useState, useEffect, useRef } from 'react';
import SourceCard from './SourceCard';
import './ChatInterface.css';

function ChatInterface({ selectedDocIds, apiUrl }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const suggestedQuestions = [
    "What are the key risks mentioned?",
    "Summarise the project objectives",
    "What sectors does this project cover?",
    "What are the expected outcomes?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAsk = async (question) => {
    if (!question.trim()) return;
    if (selectedDocIds.length === 0) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: question
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: question,
          doc_ids: selectedDocIds
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get answer');
      }

      const data = await response.json();

      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: data.answer,
        sources: data.sources || []
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err.message || 'Failed to get answer');
      console.error(err);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: err.message || 'Failed to get answer'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (input.trim()) {
      handleAsk(input);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedQuestion = (question) => {
    handleAsk(question);
  };

  if (selectedDocIds.length === 0) {
    return (
      <div className="chat-interface disabled">
        <div className="chat-container">
          <div className="messages-container">
            <div className="empty-chat-state">
              <div className="empty-chat-icon">📄</div>
              <h3>No documents selected</h3>
              <p>Select documents from the left panel to start asking questions</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      <div className="chat-container">
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-chat-state">
              <div className="empty-chat-icon">💬</div>
              <h3>Ask a question about your documents</h3>
              <p>Try one of these to get started:</p>
              <div className="suggested-questions">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    className="suggested-question-btn"
                    onClick={() => handleSuggestedQuestion(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id} className={`message ${msg.type}`}>
                  {msg.type === 'user' && (
                    <div className="message-content user-message">
                      {msg.content}
                    </div>
                  )}

                  {msg.type === 'assistant' && (
                    <div className="message-content assistant-message">
                      <p>{msg.content}</p>
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="sources-list">
                          {msg.sources.map((source, idx) => (
                            <SourceCard
                              key={idx}
                              source={source}
                              sourceNumber={idx + 1}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {msg.type === 'error' && (
                    <div className="message-content error-message-chat">
                      <span className="error-icon">⚠️</span>
                      <p>{msg.content}</p>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="message assistant">
                  <div className="message-content assistant-message">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="input-area">
          {error && !loading && (
            <div className="input-error">{error}</div>
          )}
          <div className="input-group">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your documents..."
              disabled={loading}
              className="message-input"
              rows="1"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="send-button"
              title="Send message (or press Enter)"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;
