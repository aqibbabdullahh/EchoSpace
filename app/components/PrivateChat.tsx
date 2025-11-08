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
        // Subscribe to messages FROM target user TO me
        const channelFrom = supabase
            .channel(`private_chat_from:${targetProfileId}:${myProfileId}`)
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
                        console.log('📩 Received message from', targetProfileId);
                        setMessages(prev => {
                            // Avoid duplicates
                            if (prev.find(m => m.id === newMsg.id)) return prev;
                            return [...prev, newMsg];
                        });
                        markMessagesAsRead();
                    }
                }
            )
            .subscribe((status) => {
                console.log('📡 From subscription:', status);
            });

        // Subscribe to messages FROM me TO target user
        const channelTo = supabase
            .channel(`private_chat_to:${myProfileId}:${targetProfileId}`)
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
                        console.log('📤 Sent message to', targetProfileId);
                        setMessages(prev => {
                            // Avoid duplicates
                            if (prev.find(m => m.id === newMsg.id)) return prev;
                            return [...prev, newMsg];
                        });
                    }
                }
            )
            .subscribe((status) => {
                console.log('📡 To subscription:', status);
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
        <Card className="fixed bottom-4 right-4 w-96 h-[500px] bg-white/95 backdrop-blur-sm shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-t-lg">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <div>
                        <h3 className="font-semibold">{targetUsername}</h3>
                        <p className="text-xs opacity-90">Direct Message</p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="text-white hover:bg-white/20"
                >
                    ✕
                </Button>
            </div>

            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        Start a conversation with {targetUsername}
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMyMessage = msg.from_profile_id === myProfileId;
                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[75%] rounded-lg px-4 py-2 ${
                                        isMyMessage
                                            ? 'bg-blue-500 text-white rounded-br-none'
                                            : 'bg-gray-200 text-gray-800 rounded-bl-none'
                                    }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap break-words">
                                        {msg.message}
                                    </p>
                                    <p
                                        className={`text-xs mt-1 ${
                                            isMyMessage ? 'text-blue-100' : 'text-gray-500'
                                        }`}
                                    >
                                        {new Date(msg.created_at).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </CardContent>

            {/* Input */}
            <div className="p-4 border-t bg-gray-50">
                <div className="flex gap-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || isLoading}
                        className="bg-blue-500 hover:bg-blue-600"
                    >
                        {isLoading ? '...' : 'Send'}
                    </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    Press Enter to send, Shift+Enter for new line
                </p>
            </div>
        </Card>
    );
}
