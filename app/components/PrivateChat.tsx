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
    lobby_id: string;  // Messages are scoped to specific lobbies
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
    }, [myProfileId, targetProfileId, lobbyId]);  // Re-subscribe when lobby changes

    const loadMessages = async () => {
        try {
            console.log('📥 Loading messages between', myProfileId, 'and', targetProfileId, 'in lobby', lobbyId);
            
            // Load messages in both directions FOR THIS LOBBY ONLY
            const { data, error } = await supabase
                .from('private_messages')
                .select('*')
                .eq('lobby_id', lobbyId)  // FILTER BY CURRENT LOBBY
                .or(`and(from_profile_id.eq.${myProfileId},to_profile_id.eq.${targetProfileId}),and(from_profile_id.eq.${targetProfileId},to_profile_id.eq.${myProfileId})`)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('❌ Error loading messages:', error);
                return;
            }
            
            console.log('✅ Loaded', data?.length || 0, 'messages for lobby', lobbyId);
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
                .eq('lobby_id', lobbyId)  // ONLY IN CURRENT LOBBY
                .eq('to_profile_id', myProfileId)
                .eq('from_profile_id', targetProfileId)
                .eq('is_read', false);
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    };

    const setupRealtimeSubscription = () => {
        console.log('🔌 Setting up realtime subscriptions between', myProfileId, 'and', targetProfileId, 'for lobby', lobbyId);
        
        // Subscribe to messages FROM target user TO me IN THIS LOBBY
        const channelFrom = supabase
            .channel(`private_chat_from:${targetProfileId}:${myProfileId}:${lobbyId}`, {
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
                    // Only add if it's for me AND in this lobby
                    if (newMsg.to_profile_id === myProfileId && newMsg.lobby_id === lobbyId) {
                        console.log('📩 Received message from', targetProfileId, 'in lobby', lobbyId, ':', newMsg);
                        setMessages(prev => {
                            // Avoid duplicates
                            if (prev.find(m => m.id === newMsg.id)) {
                                console.log('⚠️ Duplicate message detected, skipping');
                                return prev;
                            }
                            return [...prev, newMsg];
                        });
                        markMessagesAsRead();
                    } else if (newMsg.lobby_id !== lobbyId) {
                        console.log('🚫 Message from different lobby, ignoring');
                    }
                }
            )
            .subscribe((status, err) => {
                console.log('📡 From subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Successfully subscribed to incoming messages from', targetProfileId, 'in lobby', lobbyId);
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Channel error for incoming messages:', err);
                } else if (status === 'TIMED_OUT') {
                    console.error('⏱️ Subscription timed out, retrying...');
                }
            });

        // Subscribe to messages FROM me TO target user IN THIS LOBBY
        const channelTo = supabase
            .channel(`private_chat_to:${myProfileId}:${targetProfileId}:${lobbyId}`, {
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
                    // Only add if it's to target AND in this lobby
                    if (newMsg.to_profile_id === targetProfileId && newMsg.lobby_id === lobbyId) {
                        console.log('📤 Sent message to', targetProfileId, 'in lobby', lobbyId, ':', newMsg);
                        setMessages(prev => {
                            // Avoid duplicates
                            if (prev.find(m => m.id === newMsg.id)) {
                                console.log('⚠️ Duplicate message detected, skipping');
                                return prev;
                            }
                            return [...prev, newMsg];
                        });
                    } else if (newMsg.lobby_id !== lobbyId) {
                        console.log('🚫 Message from different lobby, ignoring');
                    }
                }
            )
            .subscribe((status, err) => {
                console.log('📡 To subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Successfully subscribed to outgoing messages to', targetProfileId, 'in lobby', lobbyId);
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
        <Card className="card-3d fixed bottom-4 right-4 w-[440px] h-[650px] bg-gradient-to-br from-slate-900/95 via-indigo-900/95 to-purple-900/95 backdrop-blur-2xl shadow-2xl border-2 border-indigo-500/30 z-50 flex flex-col rounded-3xl overflow-hidden animate-in slide-in-from-right duration-500">
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-purple-600/10 to-pink-600/10 opacity-50 holographic pointer-events-none"></div>
            
            {/* Header with 3D Effect */}
            <div className="relative flex items-center justify-between p-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-2xl neon-border">
                <div className="absolute inset-0 shimmer opacity-30"></div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="relative">
                        <div className="w-14 h-14 bg-gradient-to-br from-white/40 to-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl border-2 border-white/30 shadow-xl card-3d">
                            <span className="text-3xl animate-bounce">👤</span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-3 border-slate-900 shadow-lg" style={{ animation: 'pulse-glow 2s infinite' }}></div>
                    </div>
                    <div>
                        <h3 className="font-black text-xl neon-text tracking-wide">{targetUsername}</h3>
                        <p className="text-xs text-white/90 flex items-center gap-2 font-semibold">
                            <span className="w-2 h-2 bg-green-400 rounded-full shadow-lg shadow-green-400/50" style={{ animation: 'pulse-glow 1.5s infinite' }}></span>
                            Online · Direct Message
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="relative z-10 text-white hover:bg-white/20 rounded-full w-12 h-12 p-0 transition-all hover:rotate-90 duration-300 btn-3d border-2 border-white/20"
                >
                    ✕
                </Button>
            </div>

            {/* Messages with Glass Effect */}
            <CardContent className="flex-1 overflow-y-auto p-6 space-y-5 glass-3d scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent relative">
                {/* Particle Background */}
                <div className="absolute inset-0 particles-bg opacity-20 pointer-events-none"></div>
                
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 relative z-10 animate-in bounce-in duration-500">
                        <div className="w-24 h-24 bg-gradient-to-br from-indigo-500/30 to-purple-500/30 rounded-3xl flex items-center justify-center backdrop-blur-xl border-2 border-indigo-500/40 shadow-2xl card-3d holographic">
                            <span className="text-5xl" style={{ animation: 'float-3d 3s ease-in-out infinite' }}>💬</span>
                        </div>
                        <div>
                            <p className="text-slate-300 text-base font-bold neon-text">No messages yet</p>
                            <p className="text-slate-400 text-sm mt-2">Start a conversation with <span className="text-indigo-400 font-semibold">{targetUsername}</span></p>
                        </div>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMyMessage = msg.from_profile_id === myProfileId;
                        const isFirstInGroup = index === 0 || messages[index - 1].from_profile_id !== msg.from_profile_id;
                        
                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300 relative z-10`}
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                <div className={`flex items-end gap-3 max-w-[85%] ${isMyMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {!isMyMessage && isFirstInGroup && (
                                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0 text-white text-sm font-black shadow-xl card-3d border-2 border-indigo-400/50">
                                            {targetUsername.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    {!isMyMessage && !isFirstInGroup && <div className="w-10"></div>}
                                    
                                    <div
                                        className={`rounded-2xl px-5 py-3 shadow-2xl backdrop-blur-xl transition-all hover:scale-105 card-3d ${
                                            isMyMessage
                                                ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white rounded-br-sm border-2 border-indigo-400/50 neon-border'
                                                : 'glass-3d text-slate-100 rounded-bl-sm border-2 border-slate-600/50'
                                        }`}
                                    >
                                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed font-medium">
                                            {msg.message}
                                        </p>
                                        <p
                                            className={`text-[10px] mt-2 font-bold ${
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

            {/* Input with Neon Effect */}
            <div className="p-5 glass-3d border-t-2 border-indigo-500/30 relative">
                <div className="absolute inset-0 bg-gradient-to-t from-indigo-600/10 to-transparent pointer-events-none"></div>
                <div className="flex gap-3 items-end relative z-10">
                    <div className="flex-1 relative">
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type your message..."
                            disabled={isLoading}
                            className="glass-3d border-2 border-indigo-500/30 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/30 rounded-2xl py-7 px-5 pr-14 transition-all font-medium shadow-xl neon-border"
                        />
                        {newMessage.length > 0 && (
                            <div className="absolute right-4 bottom-4 text-indigo-400 text-xs font-bold bg-indigo-500/20 px-2 py-1 rounded-lg">
                                {newMessage.length}
                            </div>
                        )}
                    </div>
                    <Button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || isLoading}
                        className="gradient-animated text-white rounded-2xl h-[56px] px-7 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all btn-3d border-2 border-indigo-400/50 neon-border"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <span className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full" style={{ animation: 'spin 1s linear infinite' }}></span>
                            </span>
                        ) : (
                            <span className="text-xl">➤</span>
                        )}
                    </Button>
                </div>
                <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-2 font-semibold">
                    <kbd className="glass-3d px-2 py-1 rounded-lg text-indigo-300 border border-indigo-500/30">Enter</kbd> to send · 
                    <kbd className="glass-3d px-2 py-1 rounded-lg text-indigo-300 border border-indigo-500/30">Shift+Enter</kbd> for new line
                </p>
            </div>
        </Card>
    );
}
