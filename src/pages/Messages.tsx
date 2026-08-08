import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Conversation, Message, Profile } from '@/lib/types';
import { Avatar } from '@/components/shared/Avatar';
import { Send, Search, Loader2, Image as ImageIcon, ArrowLeft, Smile, PenSquare, X } from 'lucide-react';
import { formatMessageTime, formatTime } from '@/lib/utils';
import { uploadMedia, validateFile } from '@/lib/media';

interface MessagesProps {
  onProfileClick: (userId: string) => void;
  recipientId?: string | null;
  onRecipientHandled?: () => void;
}

interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  profile: Profile | null;
}

export function Messages({ onProfileClick, recipientId, onRecipientHandled }: MessagesProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientResults, setRecipientResults] = useState<Profile[]>([]);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [isTyping] = useState(false);
  const [startingConversation, setStartingConversation] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addMessage = useCallback((message: Message) => {
    setMessages((currentMessages) => (
      currentMessages.some((existingMessage) => existingMessage.id === message.id)
        ? currentMessages
        : [...currentMessages, message]
    ));
  }, []);

  const loadConversations = useCallback(async () => {
    if (!user) return;

    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (!participants || participants.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const convIds = participants.map((p) => p.conversation_id);

    const { data: allParticipants } = await supabase
      .from('conversation_participants')
      .select('user_id, conversation_id, profile:profiles!conversation_participants_user_id_fkey(*)')
      .in('conversation_id', convIds)
      .neq('user_id', user.id);

    const { data: lastMessages } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false });

    const { data: unread } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', convIds)
      .neq('sender_id', user.id)
      .is('read_at', null);

    const unreadMap = new Map<string, number>();
    (unread || []).forEach((m) => {
      unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) || 0) + 1);
    });

    const lastMsgMap = new Map<string, Message>();
    (lastMessages || []).forEach((m) => {
      if (!lastMsgMap.has(m.conversation_id)) {
        lastMsgMap.set(m.conversation_id, m as Message);
      }
    });

    const convMap = new Map<string, Conversation>();
    const otherParticipants = (allParticipants || []) as unknown as ConversationParticipant[];

    otherParticipants.forEach((p) => {
      const convId = p.conversation_id;

      if (!convMap.has(convId)) {
        convMap.set(convId, {
          id: convId,
          created_at: '',
          other_user: p.profile as Profile,
          last_message: lastMsgMap.get(convId),
          unread_count: unreadMap.get(convId) || 0,
        });
      }
    });

    const convs = Array.from(convMap.values());

    convs.sort((a, b) => {
      const aTime = a.last_message?.created_at || '';
      const bTime = b.last_message?.created_at || '';
      return bTime.localeCompare(aTime);
    });

    setConversations(convs);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as Message;

          if (activeConv && newMsg.conversation_id === activeConv.id) {
            addMessage(newMsg);

            if (newMsg.sender_id !== user.id && !newMsg.read_at) {
              supabase
                .from('messages')
                .update({ read_at: new Date().toISOString() })
                .eq('id', newMsg.id);
            }
          }

          void loadConversations();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeConv, addMessage, loadConversations]);

  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMessages(true);

    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(*)')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    setMessages((data as Message[]) || []);

    if (user) {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', convId)
        .neq('sender_id', user.id)
        .is('read_at', null);
    }

    setLoadingMessages(false);
  }, [user]);

  useEffect(() => {
    if (activeConv) {
      void loadMessages(activeConv.id);
    }
  }, [activeConv, loadMessages]);

  const startConversation = useCallback(async (recipient: Profile) => {
    if (!user || recipient.id === user.id || recipient.is_banned) return;

    setError(null);
    setStartingConversation(true);

    const { data: rpcConversationId, error: conversationError } = await supabase
      .rpc('get_or_create_conversation', { other_user: recipient.id });

    let conversationId = rpcConversationId as string | null;

    const rpcIsUnavailable = conversationError?.code === 'PGRST202'
      || conversationError?.message.includes('get_or_create_conversation');

    if (conversationError && !rpcIsUnavailable) {
      setError(conversationError.message || 'Unable to start this conversation.');
      setStartingConversation(false);
      return;
    }

    if (rpcIsUnavailable) {
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({})
        .select('id')
        .single();

      if (createError || !newConversation) {
        setError(createError?.message || 'Unable to create this conversation.');
        setStartingConversation(false);
        return;
      }

      const { error: addSelfError } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: newConversation.id,
          user_id: user.id,
        });

      const { error: addRecipientError } = addSelfError
        ? { error: addSelfError }
        : await supabase
          .from('conversation_participants')
          .insert({
            conversation_id: newConversation.id,
            user_id: recipient.id,
          });

      if (addRecipientError) {
        setError(addRecipientError.message || 'Unable to add this user to the conversation.');
        setStartingConversation(false);
        return;
      }

      conversationId = newConversation.id;
    }

    if (!conversationId) {
      setError('Unable to start this conversation.');
      setStartingConversation(false);
      return;
    }

    setActiveConv({
      id: conversationId,
      created_at: '',
      other_user: recipient,
      unread_count: 0,
    });

    setShowNewMessage(false);
    setRecipientSearch('');
    setRecipientResults([]);
    setStartingConversation(false);

    void loadConversations();
  }, [loadConversations, user]);

  useEffect(() => {
    if (!recipientId || !user) return;

    const openRequestedConversation = async () => {
      const { data: recipient, error: recipientError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', recipientId)
        .maybeSingle();

      if (recipientError || !recipient) {
        setError(recipientError?.message || 'This user is no longer available.');
      } else {
        await startConversation(recipient as Profile);
      }

      onRecipientHandled?.();
    };

    void openRequestedConversation();
  }, [onRecipientHandled, recipientId, startConversation, user]);

  useEffect(() => {
    if (!showNewMessage || recipientSearch.trim().length < 2 || !user) {
      setRecipientResults([]);
      return;
    }

    let isCurrent = true;

    const searchRecipients = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${recipientSearch.trim()}%`)
        .neq('id', user.id)
        .eq('is_banned', false)
        .order('username')
        .limit(8);

      if (isCurrent) {
        setRecipientResults((data as Profile[]) || []);
      }
    };

    void searchRecipients();

    return () => {
      isCurrent = false;
    };
  }, [recipientSearch, showNewMessage, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!user || !activeConv || !messageText.trim() || sendingMessage) return;

    const text = messageText.trim();

    setError(null);
    setSendingMessage(true);

    const { data, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: activeConv.id,
        sender_id: user.id,
        content: text,
      })
      .select('*, sender:profiles!messages_sender_id_fkey(*)')
      .single();

    if (messageError || !data) {
      setError(messageError?.message || 'Unable to send your message.');
      setSendingMessage(false);
      return;
    }

    setMessageText('');
    addMessage(data as Message);
    void loadConversations();

    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', activeConv.id)
      .neq('user_id', user.id);

    if (participants && participants.length > 0) {
      await supabase.from('notifications').insert({
        user_id: participants[0].user_id,
        actor_id: user.id,
        type: 'message',
        conversation_id: activeConv.id,
        content: text.slice(0, 100),
      });
    }

    setSendingMessage(false);
  };

  const sendImage = async (file: File) => {
    if (!user || !activeConv) return;

    const validation = validateFile(file);

    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    const result = await uploadMedia(file, 'messages', user.id);

    setError(null);
    setSendingMessage(true);

    const { data, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: activeConv.id,
        sender_id: user.id,
        media_url: result.url,
      })
      .select('*, sender:profiles!messages_sender_id_fkey(*)')
      .single();

    if (messageError || !data) {
      setError(messageError?.message || 'Unable to send this image.');
    } else {
      addMessage(data as Message);
      void loadConversations();
    }

    setSendingMessage(false);
  };

  const filteredConvs = conversations.filter((c) =>
    c.other_user?.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen">
      <div className={`w-full md:w-80 border-r border-gray-200 dark:border-neutral-800 flex flex-col ${activeConv ? 'hidden md:flex' : ''}`}>
        <div className="p-4 border-b border-gray-200 dark:border-neutral-800">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-display text-xl font-bold">Messages</h2>

            <button
              onClick={() => {
                setShowNewMessage((showing) => !showing);
                setError(null);
              }}
              className="p-2 rounded-lg text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30"
              aria-label="Start a new message"
            >
              {showNewMessage ? <X className="w-5 h-5" /> : <PenSquare className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-100 dark:bg-neutral-800 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {showNewMessage && (
            <div className="mt-3 rounded-xl bg-gray-50 dark:bg-neutral-800/60 p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                <input
                  autoFocus
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  placeholder="Search people to message..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-white dark:bg-neutral-800 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {recipientSearch.trim().length >= 2 && (
                <div className="mt-2 max-h-48 overflow-y-auto">
                  {recipientResults.length === 0 ? (
                    <p className="px-2 py-3 text-center text-xs text-gray-400">No users found.</p>
                  ) : (
                    recipientResults.map((recipient) => (
                      <button
                        key={recipient.id}
                        onClick={() => void startConversation(recipient)}
                        disabled={startingConversation}
                        className="w-full flex items-center gap-2 rounded-lg p-2 text-left hover:bg-white dark:hover:bg-neutral-800 disabled:opacity-50"
                      >
                        <Avatar profile={recipient} size={32} />

                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{recipient.username}</span>
                          {recipient.display_name && (
                            <span className="block truncate text-xs text-gray-400">
                              {recipient.display_name}
                            </span>
                          )}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="mt-2 text-xs text-error-500" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">No conversations yet.</p>
          ) : (
            filteredConvs.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConv(conv)}
                className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors ${
                  activeConv?.id === conv.id ? 'bg-gray-50 dark:bg-neutral-900' : ''
                }`}
              >
                <Avatar profile={conv.other_user} size={48} />

                <div className="flex-1 min-w-0 text-left">
                  <p className="font-semibold text-sm truncate">{conv.other_user?.username}</p>

                  <p className="text-xs text-gray-500 dark:text-neutral-400 truncate">
                    {conv.last_message?.content || (conv.last_message?.media_url ? 'Photo' : 'Start chatting')}
                  </p>
                </div>

                {conv.unread_count && conv.unread_count > 0 ? (
                  <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center">
                    {conv.unread_count}
                  </span>
                ) : (
                  conv.last_message && (
                    <span className="text-xs text-gray-400">
                      {formatMessageTime(conv.last_message.created_at)}
                    </span>
                  )
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <div className={`flex-1 flex flex-col ${!activeConv ? 'hidden md:flex' : ''}`}>
        {activeConv ? (
          <>
            <div className="flex items-center gap-3 p-3 border-b border-gray-200 dark:border-neutral-800">
              <button
                onClick={() => setActiveConv(null)}
                className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <Avatar
                profile={activeConv.other_user}
                size={40}
                onClick={() => onProfileClick(activeConv.other_user!.id)}
              />

              <div
                onClick={() => onProfileClick(activeConv.other_user!.id)}
                className="cursor-pointer"
              >
                <p className="font-semibold text-sm">{activeConv.other_user?.username}</p>
                <p className="text-xs text-success-600 dark:text-success-400">Active now</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-2">
              {loadingMessages ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                </div>
              ) : (
                <>
                  {messages.map((msg) => {
                    const isMine = msg.sender_id === user?.id;

                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                          {msg.media_url && (
                            <img src={msg.media_url} alt="" className="rounded-xl max-h-60 mb-1" />
                          )}

                          {msg.content && (
                            <div
                              className={`px-3 py-2 rounded-2xl text-sm ${
                                isMine
                                  ? 'gradient-brand text-white rounded-br-md'
                                  : 'bg-gray-100 dark:bg-neutral-800 rounded-bl-md'
                              }`}
                            >
                              {msg.content}
                            </div>
                          )}

                          <span className="text-xs text-gray-400 mt-0.5 px-1">
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="px-4 py-3 rounded-2xl bg-gray-100 dark:bg-neutral-800 rounded-bl-md flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <div className="p-3 border-t border-gray-200 dark:border-neutral-800 flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && void sendImage(e.target.files[0])}
              />

              <button
                disabled={sendingMessage}
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-50"
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Message..."
                className="flex-1 bg-gray-100 dark:bg-neutral-800 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
              />

              <button
                onClick={() => void sendMessage()}
                disabled={!messageText.trim() || sendingMessage}
                className="text-brand-600 font-semibold text-sm disabled:opacity-50"
              >
                {sendingMessage ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <Smile className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-neutral-400">Your messages</p>
              <p className="text-sm text-gray-400">Send a message to start a conversation.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}