import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAppLogic } from '@/hooks/useAppLogic';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, ChevronUp, X, Search, Send, Paperclip, Smile, Users, Star } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import EmojiPicker from 'emoji-picker-react';
import { cn } from '@/lib/utils';

const ChatBar = () => {
    const { profile } = useAppLogic();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (profile) {
            fetchConversations();
        }
    }, [profile]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);
    
    useEffect(() => {
        if (!isOpen) {
           setActiveConversation(null);
           setMessages([]);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!activeConversation) return;

        const channel = supabase
            .channel(`messages:${activeConversation.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversation.id}` },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setMessages(prev => [...prev, payload.new]);
                    }
                    if (payload.eventType === 'UPDATE') {
                        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeConversation]);

    const fetchConversations = async () => {
        const { data, error } = await supabase.rpc('get_user_conversations');
        if (error) {
            toast({ title: "Error fetching conversations", description: error.message, variant: 'destructive' });
        } else {
            setConversations(data);
        }
    };

    const fetchMessages = async (conversationId) => {
        const { data, error } = await supabase
            .from('messages')
            .select('*, sender:sender_id(id, name, avatar_url)')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) {
            toast({ title: "Error fetching messages", description: error.message, variant: 'destructive' });
        } else {
            setMessages(data);
        }
    };

    const handleConversationSelect = (conversation) => {
        setActiveConversation(conversation);
        fetchMessages(conversation.id);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeConversation) return;

        const { error } = await supabase.from('messages').insert({
            conversation_id: activeConversation.id,
            sender_id: profile.id,
            content: newMessage,
        });

        if (error) {
            toast({ title: "Error sending message", description: error.message, variant: 'destructive' });
        } else {
            setNewMessage('');
            setShowEmojiPicker(false);
        }
    };
    
    const handleSupportChat = async () => {
        toast({ title: "Feature coming soon!", description: "This will open a conversation with the support team." });
    };

    const onEmojiClick = (emojiObject) => {
        setNewMessage(prev => prev + emojiObject.emoji);
    };

    const handleToggleHighlight = async (messageId) => {
        const { error } = await supabase.rpc('toggle_highlight_message', { target_message_id: messageId });
        if (error) {
            toast({ title: "Error", description: error.message, variant: 'destructive' });
        }
    };
    
    const filteredConversations = conversations.filter(c =>
        c.participant_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed bottom-0 right-0 left-0 md:left-auto md:right-8 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="w-full md:w-[700px] h-[500px] bg-slate-900/80 backdrop-blur-xl border-t-2 border-l-2 border-r-2 border-blue-400/50 rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                            <h2 className="text-white font-bold text-lg">{activeConversation ? activeConversation.participant_name : 'Messages'}</h2>
                             <Button variant="ghost" size="icon" onClick={() => activeConversation ? setActiveConversation(null) : setIsOpen(false)} className="text-white hover:bg-white/10">
                                <X className="w-5 h-5" />
                            </Button>
                        </header>
                        <div className="flex flex-grow overflow-hidden">
                           <AnimatePresence mode="wait">
                            {activeConversation ? (
                                <motion.main
                                    key="chat-window"
                                    initial={{ x: '100%' }}
                                    animate={{ x: 0 }}
                                    exit={{ x: '100%' }}
                                    className="w-full flex flex-col bg-black/20"
                                >
                                    <div className="flex-grow p-4 overflow-y-auto flex flex-col-reverse">
                                        <div ref={messagesEndRef} />
                                        {messages.slice().reverse().map(msg => (
                                            <div key={msg.id} className={cn('flex my-2 group', msg.sender_id === profile.id ? 'justify-end' : 'justify-start')}>
                                                {profile.role === 'admin' && (
                                                    <button onClick={() => handleToggleHighlight(msg.id)} className="p-1 text-gray-500 hover:text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Star className={cn("w-4 h-4", msg.is_highlighted && "fill-yellow-400 text-yellow-400")} />
                                                    </button>
                                                )}
                                                <div className={cn('p-3 rounded-2xl max-w-xs lg:max-w-md relative', 
                                                    msg.sender_id === profile.id ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-white rounded-bl-none',
                                                    msg.is_highlighted && 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-500/20'
                                                )}>
                                                    {msg.is_highlighted && <Star className="w-4 h-4 text-yellow-300 absolute -top-2 -left-2" fill="currentColor"/>}
                                                    {msg.content}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-4 border-t border-white/10 relative">
                                        {showEmojiPicker && (
                                            <div className="absolute bottom-20 right-4 z-10">
                                                <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" />
                                            </div>
                                        )}
                                        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                            <Button type="button" variant="ghost" size="icon" className="text-gray-400 hover:text-white" onClick={() => toast({title: "Coming soon!"})}>
                                                <Paperclip className="w-5 h-5" />
                                            </Button>
                                            <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="bg-black/30 border-white/20 text-white" />
                                            <Button type="button" variant="ghost" size="icon" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-gray-400 hover:text-white">
                                                <Smile className="w-5 h-5" />
                                            </Button>
                                            <Button type="submit" size="icon">
                                                <Send className="w-5 h-5" />
                                            </Button>
                                        </form>
                                    </div>
                                </motion.main>
                            ) : (
                                <motion.aside 
                                    key="convo-list"
                                    initial={{ x: '-100%' }}
                                    animate={{ x: 0 }}
                                    exit={{ x: '-100%' }}
                                    className="w-full border-r border-white/10 flex flex-col"
                                >
                                    <div className="p-2 border-b border-white/10">
                                        <div className="relative">
                                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-black/20 border-white/20 pl-8 text-white" />
                                        </div>
                                    </div>
                                    <div className="flex-grow overflow-y-auto">
                                        <Button onClick={handleSupportChat} className="w-full justify-start rounded-none bg-blue-500/20 hover:bg-blue-500/40 text-white">
                                            <Users className="w-4 h-4 mr-2"/> Team Support
                                        </Button>
                                        {filteredConversations.map(convo => (
                                            <div key={convo.id} onClick={() => handleConversationSelect(convo)} className={`flex items-center p-3 cursor-pointer hover:bg-white/10`}>
                                                <Avatar className="w-10 h-10 mr-3">
                                                    <AvatarImage src={convo.participant_avatar_url} />
                                                    <AvatarFallback>{convo.participant_name?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="text-white overflow-hidden">
                                                    <p className="font-semibold truncate">{convo.participant_name}</p>
                                                    <p className="text-sm text-gray-400 truncate">{convo.last_message}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.aside>
                            )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button onClick={() => setIsOpen(!isOpen)} className="w-full md:w-auto md:float-right px-6 py-3 bg-blue-600 text-white font-bold rounded-t-lg flex items-center justify-center gap-2 shadow-lg hover:bg-blue-700 transition-colors">
                <MessageSquare className="w-6 h-6" />
                <span className="hidden md:inline">Messages</span>
                <ChevronUp className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
        </div>
    );
};

export default ChatBar;
