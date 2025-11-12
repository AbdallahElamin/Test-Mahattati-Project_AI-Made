import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'react-toastify';
import Loading from '../../components/Common/Loading';
import './Messages.css';

const Messages = () => {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.other_user_id);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      const response = await axios.get('/api/messages');
      setConversations(response.data.conversations || []);
    } catch (error) {
      toast.error('Error fetching conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId) => {
    try {
      const response = await axios.get(`/api/messages/${userId}`);
      setMessages(response.data.messages || []);
    } catch (error) {
      toast.error('Error fetching messages');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConversation) return;

    try {
      await axios.post('/api/messages', {
        receiver_id: selectedConversation.other_user_id,
        content: messageText
      });
      setMessageText('');
      fetchMessages(selectedConversation.other_user_id);
      fetchConversations();
    } catch (error) {
      toast.error('Error sending message');
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="messages-page">
      <div className="container">
        <h1>{t('messages')}</h1>
        <div className="messages-layout">
          <div className="conversations-list">
            {conversations.length === 0 ? (
              <p>No conversations yet.</p>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.other_user_id}
                  className={`conversation-item ${selectedConversation?.other_user_id === conv.other_user_id ? 'active' : ''}`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <div className="conversation-avatar">
                    {conv.other_user_image ? (
                      <img src={conv.other_user_image} alt={conv.other_user_name} />
                    ) : (
                      <div className="avatar-placeholder">
                        {conv.other_user_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="conversation-info">
                    <h3>{conv.other_user_name}</h3>
                    <p className="last-message">{conv.last_message}</p>
                    {conv.unread_count > 0 && (
                      <span className="unread-badge">{conv.unread_count}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="messages-container">
            {selectedConversation ? (
              <>
                <div className="messages-header">
                  <h2>{selectedConversation.other_user_name}</h2>
                </div>
                <div className="messages-list">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`message-item ${msg.sender_id === selectedConversation.other_user_id ? 'received' : 'sent'}`}
                    >
                      <p>{msg.content}</p>
                      <span className="message-time">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} className="message-input-form">
                  <input
                    type="text"
                    className="form-control"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                  />
                  <button type="submit" className="btn btn-primary">
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div className="no-conversation-selected">
                <p>Select a conversation to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;



