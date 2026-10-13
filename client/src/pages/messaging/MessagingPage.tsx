import React, { useState, useEffect, useRef } from 'react';
import { Send, Search, MessageSquare, Loader2, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { connectSocket, disconnectSocket } from '../../api/socket';
import type { Socket } from 'socket.io-client';

interface Participant {
  _id: string;
  fullName: string;
  avatarUrl?: string;
  isClinicalVerified?: boolean;
  role?: string;
}

interface Conversation {
  _id: string;
  participants: Participant[];
  lastMessage?: { text: string; sentAt: string };
  updatedAt: string;
  _isNew?: boolean;
  _recipientId?: string;
}

interface Message {
  _id?: string;
  conversationId: string;
  senderId: Participant | string;
  content: string;
  createdAt: string;
  _pending?: boolean;
}

export const MessagingPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get('userId');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasAutoSelected = useRef(false);

  // Connect Socket.IO
  useEffect(() => {
    if (!user?.id) return;
    const socket = connectSocket(user.id);
    socketRef.current = socket;

    socket.on('new_message', (msg: Message) => {
      setMessages((prev) => {
        if (msg._id && prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      scrollToBottom();
      setConversations((prev) =>
        prev
          .map((c) =>
            c._id === msg.conversationId
              ? {
                  ...c,
                  lastMessage: {
                    text: msg.content,
                    sentAt: msg.createdAt,
                  },
                  updatedAt: msg.createdAt,
                }
              : c
          )
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
      );
    });

    // Typing indicators
    socket.on('typing_start', () => {
      setTypingUser('typing');
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
    });
    socket.on('typing_stop', () => {
      setTypingUser(null);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    });

    return () => {
      socket.off('new_message');
      socket.off('typing_start');
      socket.off('typing_stop');
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      disconnectSocket();
    };
  }, [user?.id]);

  // Join / leave conversation room
  useEffect(() => {
    if (!socketRef.current || !activeConv || activeConv._isNew) return;
    socketRef.current.emit('join_conversation', activeConv._id);
    return () => {
      if (activeConv && !activeConv._isNew) {
        socketRef.current?.emit('leave_conversation', activeConv._id);
      }
    };
  }, [activeConv?._id]);

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      setLoadingConvs(true);
      try {
        const res = await apiClient.get('/chat/conversations');
        const convs: Conversation[] = res.data.data || [];
        setConversations(convs);
      } catch {
        // silent
      } finally {
        setLoadingConvs(false);
      }
    };
    if (user) fetchConversations();
  }, [user?.id]);

  // Auto-select conversation from ?userId= param
  useEffect(() => {
    if (!targetUserId || hasAutoSelected.current || loadingConvs) return;

    const existing = conversations.find((c) =>
      c.participants.some((p) => p._id === targetUserId)
    );

    if (existing) {
      setActiveConv(existing);
      hasAutoSelected.current = true;
    } else {
      // Fetch target user info to build a "new conversation" placeholder
      apiClient
        .get(`/doctor/profile/${targetUserId}`)
        .then((res) => {
          const data = res.data.data;
          // data might be a DoctorProfile with userId populated
          const userData = data?.userId || data;
          if (userData) {
            const placeholder: Conversation = {
              _id: `new_${targetUserId}`,
              participants: [
                {
                  _id: user?.id || '',
                  fullName: user?.fullName || '',
                  avatarUrl: user?.avatarUrl,
                },
                {
                  _id: targetUserId,
                  fullName: userData.fullName || data?.fullName || 'Colleague',
                  avatarUrl: userData.avatarUrl,
                  isClinicalVerified: userData.isClinicalVerified,
                  role: userData.role,
                },
              ],
              lastMessage: undefined,
              updatedAt: new Date().toISOString(),
              _isNew: true,
              _recipientId: targetUserId,
            };
            setActiveConv(placeholder);
          }
        })
        .catch(() => {
          // Try fetching as a regular user
          apiClient
            .get(`/admin/users`)
            .catch(() => {})
            .then(() => {});
        });
      hasAutoSelected.current = true;
    }
  }, [targetUserId, loadingConvs, conversations.length]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeConv || activeConv._isNew) {
      if (activeConv?._isNew) setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setLoadingMsgs(true);
      try {
        const res = await apiClient.get(`/chat/messages/${activeConv._id}`);
        setMessages(res.data.data || []);
        scrollToBottom(true);
      } catch {
        setMessages([]);
      } finally {
        setLoadingMsgs(false);
      }
    };

    fetchMessages();
    inputRef.current?.focus();
  }, [activeConv?._id]);

  const scrollToBottom = (immediate = false) => {
    if (immediate) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior }), 50);
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeConv || !user || sending) return;

    const text = inputMessage.trim();
    setInputMessage('');

    // Determine recipient and conversation id
    const isNew = activeConv._isNew;
    const convId = isNew ? undefined : activeConv._id;
    const recipientId = isNew
      ? activeConv._recipientId
      : activeConv.participants.find((p) => p._id !== user.id)?._id;

    // Optimistic message
    const optimisticMsg: Message = {
      _id: `temp_${Date.now()}`,
      conversationId: activeConv._id,
      senderId: user.id,
      content: text,
      createdAt: new Date().toISOString(),
      _pending: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();

    setSending(true);
    try {
      const res = await apiClient.post('/chat/messages', {
        conversationId: convId,
        recipientId,
        content: text,
      });

      const savedMsg = res.data.data;
      const realConvId = res.data.conversationId;

      // If this was a new conversation, replace placeholder and refresh list
      if (isNew) {
        const convRes = await apiClient.get('/chat/conversations');
        const convs: Conversation[] = convRes.data.data || [];
        setConversations(convs);
        const realConv = convs.find((c) => c._id.toString() === realConvId?.toString());
        if (realConv) setActiveConv(realConv);
      }

      // Emit via socket
      if (socketRef.current && recipientId) {
        socketRef.current.emit('send_message', {
          conversationId: realConvId || activeConv._id,
          recipientId,
          message: savedMsg,
        });
      }

      // Replace optimistic with real message
      setMessages((prev) =>
        prev.map((m) =>
          m._id === optimisticMsg._id ? { ...savedMsg, _pending: false } : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === optimisticMsg._id
            ? { ...m, _pending: false, content: m.content + ' ⚠ (failed)' }
            : m
        )
      );
    } finally {
      setSending(false);
    }
  };

  const filteredConvs = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const partner = c.participants.find((p) => p._id !== user?.id) || c.participants[0];
    return partner?.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getPartner = (conv: Conversation): Participant | undefined =>
    conv.participants.find((p) => p._id !== user?.id) || conv.participants[0];

  const getSenderId = (msg: Message): string =>
    typeof msg.senderId === 'object'
      ? (msg.senderId as Participant)._id
      : (msg.senderId as string);

  return (
    <div className="max-w-5xl mx-auto px-4 py-5">
      <div className="card-linkedin overflow-hidden flex h-[78vh] min-h-[400px]">

        {/* Left conversations rail */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 flex flex-col bg-white">
          <div className="p-3 border-b border-gray-200">
            <h2 className="font-bold text-sm text-gray-900 mb-2">Messaging</h2>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations…"
                className="w-full pl-8 pr-3 py-1.5 bg-[#EDF3F8] rounded text-xs outline-none text-gray-800"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loadingConvs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-[#0A66C2]" />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <MessageSquare size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-gray-500">No conversations yet</p>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                  Connect with verified doctors to start a conversation
                </p>
              </div>
            ) : (
              filteredConvs.map((conv) => {
                const partner = getPartner(conv);
                const isSelected = activeConv?._id === conv._id;
                return (
                  <button
                    key={conv._id}
                    onClick={() => setActiveConv(conv)}
                    className={`w-full text-left p-3 flex items-start gap-3 transition-colors ${
                      isSelected
                        ? 'bg-[#EBF5FF] border-l-[3px] border-[#0A66C2]'
                        : 'hover:bg-gray-50 border-l-[3px] border-transparent'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={
                          partner?.avatarUrl ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(partner?.fullName || 'U')}`
                        }
                        alt={partner?.fullName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      {partner?.isClinicalVerified && (
                        <ShieldCheck
                          size={12}
                          className="absolute -bottom-0.5 -right-0.5 text-[#0A66C2] bg-white rounded-full"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs text-gray-900 truncate">
                        {partner?.fullName || 'Colleague'}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        {conv._isNew
                          ? 'New conversation'
                          : conv.lastMessage?.text || 'Conversation started'}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {conv.lastMessage?.sentAt
                          ? new Date(conv.lastMessage.sentAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })
                          : new Date(conv.updatedAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right chat area */}
        <div className="flex-1 flex flex-col bg-[#F8FAFC] min-w-0">
          {activeConv ? (
            <>
              {/* Chat header */}
              {(() => {
                const partner = getPartner(activeConv);
                return (
                  <div className="px-5 py-3 border-b border-gray-200 bg-white flex items-center gap-3">
                    <img
                      src={
                        partner?.avatarUrl ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(partner?.fullName || 'U')}`
                      }
                      alt={partner?.fullName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                        {partner?.fullName || 'Colleague'}
                        {partner?.isClinicalVerified && (
                          <ShieldCheck size={13} className="text-[#0A66C2]" />
                        )}
                      </h3>
                      <p className="text-[10px] text-gray-500">
                        {partner?.role?.replace(/_/g, ' ')} •{' '}
                        {activeConv._isNew ? 'Start a conversation' : 'End-to-end encrypted'}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Messages stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 size={20} className="animate-spin text-[#0A66C2]" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full flex-col gap-2 text-gray-400">
                    <MessageSquare size={28} className="text-gray-300" />
                    <p className="text-xs">Send a message to start the conversation</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine = getSenderId(msg) === user?.id;
                    const senderObj =
                      typeof msg.senderId === 'object' ? (msg.senderId as Participant) : null;
                    return (
                      <div
                        key={msg._id || idx}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'} gap-2 group`}
                      >
                        {!isMine && senderObj?.avatarUrl && (
                          <img
                            src={senderObj.avatarUrl}
                            alt={senderObj.fullName}
                            className="w-6 h-6 rounded-full object-cover flex-shrink-0 self-end mb-4"
                          />
                        )}
                        <div
                          className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}
                        >
                          <div
                            className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                              isMine
                                ? `bg-[#0A66C2] text-white rounded-br-sm ${msg._pending ? 'opacity-70' : ''}`
                                : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm shadow-sm'
                            }`}
                          >
                            {msg.content}
                          </div>
                          <p className="text-[9px] mt-0.5 px-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {msg._pending && ' · Sending…'}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Typing indicator */}
              {typingUser && (
                <div className="px-4 pb-1 flex items-center gap-1.5 text-[11px] text-gray-400">
                  <span className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                  <span>typing…</span>
                </div>
              )}

              {/* Input */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white border-t border-gray-200 flex gap-2 items-center"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => {
                    setInputMessage(e.target.value);
                    // Emit typing events
                    if (socketRef.current && activeConv && !activeConv._isNew) {
                      socketRef.current.emit('typing_start', {
                        conversationId: activeConv._id,
                        userId: user?.id,
                      });
                      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                      typingTimeoutRef.current = setTimeout(() => {
                        socketRef.current?.emit('typing_stop', {
                          conversationId: activeConv._id,
                          userId: user?.id,
                        });
                      }, 1500);
                    }
                  }}
                  placeholder="Write a professional message…"
                  className="flex-1 px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-full text-xs text-gray-900 outline-none focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]/20"
                  maxLength={2000}
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || sending}
                  className="p-2 rounded-full bg-[#0A66C2] text-white hover:bg-[#0956a8] disabled:opacity-40 transition-colors flex-shrink-0"
                  aria-label="Send message"
                >
                  {sending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <MessageSquare size={32} className="text-[#0A66C2]" />
              </div>
              <h3 className="font-bold text-sm text-gray-800 mb-1">Your professional inbox</h3>
              <p className="text-xs text-gray-500 max-w-xs">
                Select a conversation or connect with verified clinicians from your network.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
