"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface PrivateMessage {
    id: string;
    from_profile_id: string;
    to_profile_id: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

interface PrivateChatProps {
    myProfileId: string;
    myUsername: string;
    targetProfileId: string;
    targetUsername: string;
    lobbyId: string;
    onClose: () => void;
}

export default function PrivateChat({
    myProfileId,
    myUsername,
    targetProfileId,
    targetUsername,
    lobbyId,
    onClose
}: PrivateChatProps) {
    const [messages, setMessages] = useState<PrivateMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const subscriptionRef = useRef<any>(null);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load existing messages
    useEffect(() => {
        loadMessages();
        setupRealtimeSubscription();

        return () => {
            if (subscriptionRef.current) {
                console.log('🔌 Unsubscribing from private chat channels');
                supabase.removeChannel(subscriptionRef.current.from);
                supabase.removeChannel(subscriptionRef.current.to);
            }
        };
    }, [myProfileId, targetProfileId]);

    const loadMessages = async () => {
        try {
            console.log('📥 Loading messages between', myProfileId, 'and', targetProfileId);
            
            // Load messages in both directions
            const { data, error } = await supabase
                .from('private_messages')
                .select('*')
                .or(`and(from_profile_id.eq.${myProfileId},to_profile_id.eq.${targetProfileId}),and(from_profile_id.eq.${targetProfileId},to_profile_id.eq.${myProfileId})`)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('❌ Error loading messages:', error);
                return;
            }
            
            console.log('✅ Loaded', data?.length || 0, 'messages');
            if (data) {
                setMessages(data);
                // Mark messages as read
                markMessagesAsRead();
            }
        } catch (error) {
            console.error('❌ Error loading messages:', error);
        }
    };

    const markMessagesAsRead = async () => {
        try {
            await supabase
                .from('private_messages')
                .update({ is_read: true })
                .eq('to_profile_id', myProfileId)
                .eq('from_profile_id', targetProfileId)
                .eq('is_read', false);
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    };

    const setupRealtimeSubscription = () => {
        console.log('🔌 Setting up realtime subscriptions between', myProfileId, 'and', targetProfileId);
        
        // Subscribe to messages FROM target user TO me
        const channelFrom = supabase
            .channel(`private_chat_from:${targetProfileId}:${myProfileId}`, {
                config: {
                    broadcast: { self: false },
                    presence: { key: '' }
                }
            })
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'private_messages',
                    filter: `from_profile_id=eq.${targetProfileId}`
                },
                (payload) => {
                    const newMsg = payload.new as PrivateMessage;
                    // Only add if it's for me
                    if (newMsg.to_profile_id === myProfileId) {
                        console.log('📩 Received message from', targetProfileId, ':', newMsg);
                        setMessages(prev => {
                            // Avoid duplicates
                            if (prev.find(m => m.id === newMsg.id)) {
                                console.log('⚠️ Duplicate message detected, skipping');
                                return prev;
                            }
                            return [...prev, newMsg];
                        });
                        markMessagesAsRead();
                    }
                }
            )
            .subscribe((status, err) => {
                console.log('📡 From subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Successfully subscribed to incoming messages from', targetProfileId);
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Channel error for incoming messages:', err);
                } else if (status === 'TIMED_OUT') {
                    console.error('⏱️ Subscription timed out, retrying...');
                }
            });

        // Subscribe to messages FROM me TO target user
        const channelTo = supabase
            .channel(`private_chat_to:${myProfileId}:${targetProfileId}`, {
                config: {
                    broadcast: { self: false },
                    presence: { key: '' }
                }
            })
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'private_messages',
                    filter: `from_profile_id=eq.${myProfileId}`
                },
                (payload) => {
                    const newMsg = payload.new as PrivateMessage;
                    // Only add if it's to target
                    if (newMsg.to_profile_id === targetProfileId) {
                        console.log('📤 Sent message to', targetProfileId, ':', newMsg);
                        setMessages(prev => {
                            // Avoid duplicates
                            if (prev.find(m => m.id === newMsg.id)) {
                                console.log('⚠️ Duplicate message detected, skipping');
                                return prev;
                            }
                            return [...prev, newMsg];
                        });
                    }
                }
            )
            .subscribe((status, err) => {
                console.log('📡 To subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Successfully subscribed to outgoing messages to', targetProfileId);
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Channel error for outgoing messages:', err);
                } else if (status === 'TIMED_OUT') {
                    console.error('⏱️ Subscription timed out, retrying...');
                }
            });

        subscriptionRef.current = { from: channelFrom, to: channelTo };
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || isLoading) return;

        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('private_messages')
                .insert({
                    from_profile_id: myProfileId,
                    to_profile_id: targetProfileId,
                    message: newMessage.trim(),
                    lobby_id: lobbyId,
                    is_read: false
                });

            if (!error) {
                setNewMessage('');
            } else {
                console.error('Error sending message:', error);
                alert('Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <Card className="fixed bottom-4 right-4 w-[420px] h-[600px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 backdrop-blur-xl shadow-2xl border border-slate-700/50 z-50 flex flex-col rounded-2xl overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-white/30 to-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                            <span className="text-2xl">👤</span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse"></div>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">{targetUsername}</h3>
                        <p className="text-xs text-white/80 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            Online · Direct Message
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="text-white hover:bg-white/20 rounded-full w-10 h-10 p-0 transition-all hover:rotate-90 duration-300"
                >
                    ✕
                </Button>
            </div>

            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-slate-900/50 to-slate-800/50 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-indigo-500/30">
                            <span className="text-4xl">💬</span>
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm font-medium">No messages yet</p>
                            <p className="text-slate-500 text-xs mt-1">Start a conversation with {targetUsername}</p>
                        </div>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMyMessage = msg.from_profile_id === myProfileId;
                        const isFirstInGroup = index === 0 || messages[index - 1].from_profile_id !== msg.from_profile_id;
                        
                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}
                            >
                                <div className={`flex items-end gap-2 max-w-[85%] ${isMyMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {!isMyMessage && isFirstInGroup && (
                                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-lg">
                                            {targetUsername.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    {!isMyMessage && !isFirstInGroup && <div className="w-8"></div>}
                                    
                                    <div
                                        className={`rounded-2xl px-4 py-3 shadow-lg backdrop-blur-sm transition-all hover:scale-[1.02] ${
                                            isMyMessage
                                                ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-br-md'
                                                : 'bg-slate-700/80 text-slate-100 rounded-bl-md border border-slate-600/50'
                                        }`}
                                    >
                                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                                            {msg.message}
                                        </p>
                                        <p
                                            className={`text-[10px] mt-1.5 font-medium ${
                                                isMyMessage ? 'text-indigo-200' : 'text-slate-400'
                                            }`}
                                        >
                                            {new Date(msg.created_at).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </CardContent>

            {/* Input */}
            <div className="p-4 bg-slate-800/80 backdrop-blur-sm border-t border-slate-700/50">
                <div className="flex gap-2 items-end">
                    <div className="flex-1 relative">
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type your message..."
                            disabled={isLoading}
                            className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl py-6 px-4 pr-12 transition-all"
                        />
                        <div className="absolute right-3 bottom-3 text-slate-500 text-xs">
                            {newMessage.length > 0 && `${newMessage.length}`}
                        </div>
                    </div>
                    <Button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || isLoading}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl h-[52px] px-6 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            </span>
                        ) : (
                            <span className="text-lg">➤</span>
                        )}
                    </Button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                    <kbd className="bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-400">Enter</kbd> to send · 
                    <kbd className="bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-400">Shift+Enter</kbd> for new line
                </p>
            </div>
        </Card>
    );
}
