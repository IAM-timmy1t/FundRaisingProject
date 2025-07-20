import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Minus, X, Send, Paperclip, Smile, Image, Video as VideoIcon } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useAppLogic } from '@/hooks/useAppLogic';
import { supabase } from '@/lib/customSupabaseClient';
import EmojiPicker from 'emoji-picker-react';

const ConversationList = ({ conversations, onSelect, user }) => (
    <div className="flex flex-col h-full">
        <div className="p-4 border-b border-white/20 flex-shrink-0">
            <h2 className="text-xl font-bold text-white">Messages</h2>
        </div>
        <div className="flex-grow overflow-y-auto">
            {conversations.length === 0 && (
                <div className="text-center p-8 text-blue-200">
                    <p>No conversations yet. Start talking to people in the community!</p>
                </div>
            )}
            {conversations.map(convo => {
                const otherParticipant = convo.participants.find(p => p.user_id !== user.id)?.profiles;
                if (!otherParticipant) return null;
                return (
                    <div
                        key={convo.id}
                        onClick={() => onSelect(convo)}
                        className="flex items-center p-3 cursor-pointer hover:bg-white/10 transition-colors"
                    >
                        <Avatar className="w-12 h-12 mr-3 flex-shrink-0">
                            <AvatarImage src={otherParticipant.avatar_url} />
                            <AvatarFallback>{otherParticipant.name ? otherParticipant.name[0] : '?'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-grow overflow-hidden">
                            <p className="font-semibold text-white truncate">{otherParticipant.name}</p>
                            <p className="text-sm text-blue-200 truncate">{convo.last_message || 'No messages yet'}</p>
                        </div>
                        {convo.unread_count > 0 && (
                            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0">
                                {convo.unread_count}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
);

const ChatWindow = ({ conversation, messages, onSendMessage, user, onBack }) => {
    const [newMessage, setNewMessage] = useState('');
    const [file, setFile] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const { toast } = useToast();
    const otherParticipant = conversation?.participants.find(p => p.user_id !== user.id)?.profiles;

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (newMessage.trim() || file) {
            onSendMessage(conversation.id, newMessage, file);
            setNewMessage('');
            setFile(null);
        }
    };
    
    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile.size > 10 * 1024 * 1024) { // 10MB
                toast({ title: "File too large!", description: "Please choose a file under 10MB.", variant: "destructive" });
                return;
            }
            setFile(selectedFile);
        }
    };

    if (!conversation || !otherParticipant) return null;

    return (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 flex flex-col h-full rounded-lg">
            <header className="flex items-center p-3 border-b border-white/20 flex-shrink-0 bg-black/20 backdrop-blur-sm rounded-t-lg">
                <Button variant="ghost" size="icon" className="mr-2" onClick={onBack}>
                    <X className="w-5 h-5 text-white" />
                </Button>
                <Avatar className="w-10 h-10 mr-3">
                    <AvatarImage src={otherParticipant.avatar_url} />
                    <AvatarFallback>{otherParticipant.name ? otherParticipant.name[0] : '?'}</AvatarFallback>
                </Avatar>
                <h3 className="font-bold text-white text-lg">{otherParticipant.name}</h3>
            </header>
            <main className="flex-grow p-4 overflow-y-auto space-y-4">
                {messages.map(msg => (
                     <div key={msg.id} className={cn("flex items-end gap-2", msg.sender_id === user.id ? "justify-end" : "justify-start")}>
                         {msg.sender_id !== user.id && (
                             <Avatar className="w-8 h-8 self-end flex-shrink-0">
                                 <AvatarImage src={otherParticipant.avatar_url} />
                                 <AvatarFallback>{otherParticipant.name ? otherParticipant.name[0] : '?'}</AvatarFallback>
                             </Avatar>
                         )}
                        <div className={cn(
                            "max-w-xs md:max-w-md p-3 rounded-2xl text-white",
                            msg.sender_id === user.id ? "bg-blue-600 rounded-br-none" : "bg-white/20 rounded-bl-none"
                        )}>
                            {msg.media_url && (
                                <div className="mb-2">
                                    {msg.media_type.startsWith('image/') && <img src={msg.media_url} alt="attachment" className="rounded-lg max-w-full" />}
                                    {msg.media_type.startsWith('video/') && <video src={msg.media_url} controls className="rounded-lg max-w-full" />}
                                </div>
                            )}
                            {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                            <span className="text-xs text-blue-200 block text-right mt-1">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </main>
            <footer className="p-2 border-t border-white/20 flex-shrink-0 bg-black/20 backdrop-blur-sm rounded-b-lg">
                {file && (
                    <div className="px-2 pb-2 flex items-center justify-between bg-black/20 rounded-md mb-2">
                        <span className="text-sm text-white truncate">{file.name}</span>
                        <Button variant="ghost" size="icon" onClick={() => setFile(null)}><X className="w-4 h-4 text-red-400"/></Button>
                    </div>
                )}
                <div className="flex items-center bg-white/10 rounded-full p-1">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full text-white/70 hover:text-white"><Smile className="w-5 h-5"/></Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 border-none bg-transparent">
                            <EmojiPicker onEmojiClick={(emoji) => setNewMessage(prev => prev + emoji.emoji)} theme="dark" />
                        </PopoverContent>
                    </Popover>
                    <Input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        id="message-file-input"
                    />
                    <Button variant="ghost" size="icon" className="rounded-full text-white/70 hover:text-white" onClick={() => fileInputRef.current.click()}><Paperclip className="w-5 h-5"/></Button>
                    <Input
                        placeholder="Type a message..."
                        className="bg-transparent border-none focus-visible:ring-0 text-white placeholder:text-blue-200 flex-grow"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <Button type="button" size="icon" className="rounded-full bg-blue-500 hover:bg-blue-600 w-10 h-10 flex-shrink-0" onClick={handleSend}>
                        <Send className="w-5 h-5" />
                    </Button>
                </div>
            </footer>
        </div>
    );
};


export default function ChatWidget() {
    const { user, profile } = useAppLogic();
    const [isOpen, setIsOpen] = useState(false);
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const { toast } = useToast();

    const fetchConversations = useCallback(async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('conversations')
            .select(`
                id,
                participants:conversation_participants (
                    user_id,
                    profiles ( name, avatar_url )
                ),
                messages ( content, created_at, is_read, sender_id )
            `)
            .order('created_at', { foreignTable: 'messages', ascending: false })
            .limit(1, { foreignTable: 'messages' });

        if (error) {
            toast({ title: "Error fetching conversations", description: error.message, variant: 'destructive' });
        } else {
            const formattedConversations = data.map(c => ({
                id: c.id,
                participants: c.participants,
                last_message: c.messages[0]?.content || 'No messages yet',
                unread_count: c.messages.filter(m => !m.is_read && m.sender_id !== user.id).length
            })).sort((a, b) => new Date(b.messages?.[0]?.created_at || 0) - new Date(a.messages?.[0]?.created_at || 0));
            setConversations(formattedConversations);
        }
    }, [user, toast]);

    const fetchMessages = useCallback(async (conversationId) => {
        const { data, error } = await supabase
            .from('messages')
            .select('*, sender:profiles(id, name, avatar_url)')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });
        
        if (error) {
            toast({ title: "Error fetching messages", description: error.message, variant: 'destructive' });
        } else {
            setMessages(data);
        }
    }, [toast]);
    
    useEffect(() => {
        fetchConversations();
        const interval = setInterval(fetchConversations, 30000); // Poll every 30 seconds
        return () => clearInterval(interval);
    }, [fetchConversations]);

    useEffect(() => {
        if (activeConversation) {
            fetchMessages(activeConversation.id);
        }
    }, [activeConversation, fetchMessages]);

    useEffect(() => {
        const channel = supabase.channel('public:messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                if (activeConversation && payload.new.conversation_id === activeConversation.id) {
                    setMessages(currentMessages => [...currentMessages, payload.new]);
                }
                if (payload.new.sender_id !== user.id) {
                     toast({ title: "New Message Received", description: "You have a new message." });
                }
                fetchConversations();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeConversation, user, toast, fetchConversations]);

    const handleSendMessage = async (convoId, content, file) => {
        let media_url = null;
        let media_type = null;

        const { data: messageData, error: messageError } = await supabase.from('messages').insert({
            conversation_id: convoId,
            sender_id: user.id,
            content: content || '',
        }).select().single();

        if (messageError) {
            toast({ title: 'Error sending message', description: messageError.message, variant: 'destructive' });
            return;
        }

        if (file) {
            const fileExt = file.name.split('.').pop();
            const filePath = `${messageData.id}/${user.id}-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('message_media').upload(filePath, file);

            if (uploadError) {
                toast({ title: "Attachment upload failed", description: uploadError.message, variant: 'destructive' });
                await supabase.from('messages').delete().eq('id', messageData.id);
            } else {
                const { data: urlData } = supabase.storage.from('message_media').getPublicUrl(filePath);
                media_url = urlData.publicUrl;
                media_type = file.type;
                const { error: updateError } = await supabase.from('messages').update({ media_url, media_type }).eq('id', messageData.id);
                if (updateError) {
                    toast({ title: 'Error attaching file', description: updateError.message, variant: 'destructive' });
                }
            }
        }
    };

    if (!profile) return null;

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="fixed bottom-24 right-5 w-[380px] h-[550px] bg-white/5 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl z-50 overflow-hidden"
                    >
                        {activeConversation ? (
                            <ChatWindow 
                                conversation={activeConversation}
                                messages={messages}
                                onSendMessage={handleSendMessage}
                                user={user}
                                onBack={() => setActiveConversation(null)}
                            />
                        ) : (
                            <ConversationList 
                                conversations={conversations}
                                onSelect={setActiveConversation}
                                user={user}
                            />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-5 right-5 w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-white shadow-lg z-50"
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={isOpen ? "close" : "open"}
                        initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                        animate={{ rotate: 0, opacity: 1, scale: 1 }}
                        exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.2 }}
                    >
                        {isOpen ? <X size={32} /> : <MessageSquare size={32} />}
                    </motion.div>
                </AnimatePresence>
            </motion.button>
        </>
    );
}