
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MessagesView = () => {
    const navigate = useNavigate();
    
    useEffect(() => {
        // This component is now just a fallback. 
        // The main functionality is in the ChatWidget.
        // We can redirect or show a message.
        // For now, let's just show a placeholder message.
    }, []);

    return (
        <motion.div
            key="messages-fallback"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="container mx-auto h-[calc(100vh-200px)] py-4 flex items-center justify-center"
        >
            <div className="text-center text-white bg-white/10 p-10 rounded-lg backdrop-blur-lg border border-white/20">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
                <h1 className="text-3xl font-bold">Your Messages</h1>
                <p className="mt-2 text-blue-200">
                    Your conversations are now available in the chat widget at the bottom right of your screen.
                </p>
                <button 
                    onClick={() => navigate('/')} 
                    className="mt-6 px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full font-semibold"
                >
                    Back to Home
                </button>
            </div>
        </motion.div>
    );
};

export default MessagesView;
