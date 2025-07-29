import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile } from 'lucide-react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

interface Message {
  id: string;
  message: string;
  user: {
    id: string;
    username: string;
  };
  timestamp: string;
}

interface ChatPanelProps {
  socket: any;
  currentUser: any;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ socket, currentUser }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (socket) {
      socket.on('chat-message', (message: Message) => {
        setMessages(prev => [...prev, message]);
      });

      return () => {
        socket.off('chat-message');
      };
    }
  }, [socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    socket.emit('chat-message', {
      message: newMessage,
      user: currentUser
    });

    setNewMessage('');
  };

  const handleEmojiSelect = (emoji: { native: string }) => {
    setNewMessage(prev => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-slate-800 rounded-xl h-96 flex flex-col border border-slate-700">
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-white">Chat</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 text-sm">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col ${
                message.user.id === currentUser.id ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-xs px-3 py-2 rounded-lg ${
                  message.user.id === currentUser.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-white'
                }`}
              >
                <div className="text-sm">{message.message}</div>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {message.user.username} • {formatTime(message.timestamp)}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-700">
        <form onSubmit={handleSendMessage} className="relative">
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Type your message..."
              />
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                <Smile className="w-5 h-5" />
              </button>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {showEmojiPicker && (
            <div className="absolute bottom-full right-0 mb-2 z-10">
              <Picker
                data={data}
                onEmojiSelect={handleEmojiSelect}
                theme="dark"
                autoFocus={true}
                icons="solid"
                locale="en"
                navPosition="bottom"
                previewPosition="none"
                skinTonePosition="none"
                emojiSize={20}
                emojiButtonSize={28}
                maxFrequentRows={2}
              />
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;