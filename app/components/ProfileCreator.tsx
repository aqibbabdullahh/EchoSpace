// app/components/ProfileCreator.tsx - Enhanced version with personality

"use client";

import { useState, useEffect } from 'react';
import { useLobbyStore } from '@/lib/lobbyStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface ProfileCreatorProps {
    onComplete: () => void;
    editingProfile?: any;
    isEditing?: boolean;
}

const ProfileCreator = ({ onComplete, editingProfile, isEditing = false }: ProfileCreatorProps) => {
    const { createProfile, profile, loadProfile } = useLobbyStore();
    const [step, setStep] = useState(1);
    const [isCreating, setIsCreating] = useState(false);

    // Profile data - initialize with existing data if editing
    const [username, setUsername] = useState(editingProfile?.username || '');
    const [selectedAvatar, setSelectedAvatar] = useState(editingProfile?.selected_avatar_model || '/avatars/raiden.vrm');
    const [personality, setPersonality] = useState(editingProfile?.ai_personality_prompt || '');
    const [interests, setInterests] = useState<string[]>(editingProfile?.interests || []);
    const [bio, setBio] = useState(editingProfile?.bio || '');
    // const [preferredGreeting, setPreferredGreeting] = useState(editingProfile?.preferred_greeting || ''); // REMOVED
    const [isCustomPersonality, setIsCustomPersonality] = useState(false);

    const avatarOptions = [
        { 
            id: '1', 
            model: '/avatars/raiden.vrm', 
            name: 'Raiden',
            preview: '/avatar-previews/raiden.webp',
        },
        { 
            id: '2', 
            model: '/avatars/ayato.vrm', 
            name: 'Ayato',
            preview: '/avatar-previews/ayato.webp',
        },
        { 
            id: '3', 
            model: '/avatars/kazuha.vrm', 
            name: 'Kazuha',
            preview: '/avatar-previews/kazuha.webp',
        },
        { 
            id: '4', 
            model: '/avatars/eula.vrm', 
            name: 'Eula',
            preview: '/avatar-previews/eula.webp',
        }
    ];

    const personalityTemplates = [
        { label: "Friendly Explorer", value: "friendly and curious, loves meeting new people and exploring virtual worlds" },
        { label: "Tech Enthusiast", value: "passionate about technology, AI, and the future of the metaverse" },
        { label: "Creative Artist", value: "artistic soul who enjoys creating and sharing creative experiences" },
        { label: "Chill Gamer", value: "laid-back gamer who enjoys hanging out and having fun conversations" },
        { label: "Knowledge Seeker", value: "always learning, asking questions, and sharing interesting facts" },
        { label: "Custom", value: "" }
    ];

    const interestOptions = [
        "🎮 Gaming", "🤖 AI/Tech", "🎨 Art", "🎵 Music", 
        "📚 Learning", "💬 Chatting", "🌍 Exploring", "⚔️ Combat",
        "🏗️ Building", "📖 Stories", "🎬 Movies", "🏃 Sports"
    ];

    // Initialize custom personality state when editing existing profiles
    useEffect(() => {
        if (editingProfile?.ai_personality_prompt) {
            // Extract just the personality part from the full AI prompt
            // Look for "Personality: " and extract the part after it until "Background:"
            const fullPrompt = editingProfile.ai_personality_prompt;
            const personalityMatch = fullPrompt.match(/Personality: ([^.]+\.)/);
            let extractedPersonality = '';

            if (personalityMatch) {
                extractedPersonality = personalityMatch[1].replace(/\.$/, '').trim();
            }

            // Check if it matches any of our templates
            const matchingTemplate = personalityTemplates.slice(0, -1)
                .find(template => template.value === extractedPersonality);

            if (matchingTemplate) {
                setPersonality(matchingTemplate.value);
                setIsCustomPersonality(false);
            } else {
                setPersonality(extractedPersonality || editingProfile.ai_personality_prompt);
                setIsCustomPersonality(true);
            }
        }
    }, [editingProfile]);

    const handleCreateProfile = async () => {
        if (!username.trim()) {
            alert('Please enter a username');
            return;
        }

        setIsCreating(true);

        // Build the full profile with personality
        const profileData = {
            username: username.trim(),
            selected_avatar_model: selectedAvatar,
            personality: personality || personalityTemplates[0].value,
            bio: bio.trim(),
            interests: interests,
            // This will be used when the digital twin is offline and someone chats with it
            ai_personality_prompt: `You are ${username.trim()}.
                Personality: ${personality || personalityTemplates[0].value}.
                Background: ${bio || 'Just exploring the metaverse!'}
                Interests: ${interests.join(', ') || 'meeting people'}.
                Keep responses friendly and brief, staying true to this personality.`
        };

        const success = await createProfile(
            profileData.username,
            profileData.selected_avatar_model,
            profileData.ai_personality_prompt,
            profileData.bio,
            profileData.interests
        );

        if (success) {
            // If editing, reload the profile to get fresh data
            if (isEditing) {
                await loadProfile();
            }
            onComplete();
        } else {
            alert(isEditing ? 'Failed to update profile. Please try again.' : 'Failed to create profile. Try a different username.');
        }
        setIsCreating(false);
    };

    // If profile exists and we're not editing, show welcome back
    if (profile && !isEditing) {
        return (
            <div className="w-full max-w-md mx-auto px-4 py-16">
                <Card className="border-0 bg-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-700" style={{
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                    borderRadius: '24px'
                }}>
                    <CardContent className="p-10 text-center">
                        <div className="mb-8">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-4xl shadow-2xl shadow-purple-500/30">
                                👋
                            </div>
                            <h2 className="text-3xl font-semibold text-white mb-3" style={{ 
                                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
                                letterSpacing: '-0.03em'
                            }}>
                                Welcome back, {profile.username}
                            </h2>
                            <p className="text-lg text-gray-400" style={{ 
                                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
                            }}>
                                Your digital twin is ready to explore the metaverse
                            </p>
                        </div>
                        <Button 
                            onClick={onComplete} 
                            className="w-full h-14 text-base font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0 rounded-xl shadow-lg hover:shadow-purple-500/50 transition-all duration-300"
                            style={{ 
                                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
                            }}
                        >
                            Enter YNGO
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="w-full max-w-3xl mx-auto px-4 py-8">
            {/* Apple-style minimal header */}
            <div className="text-center mb-12 animate-in fade-in duration-700">
                <h1 className="text-5xl font-semibold tracking-tight mb-4" style={{ 
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.03em'
                }}>
                    {isEditing ? 'Edit Your Profile' : 'Create Your Digital Twin'}
                </h1>
                <p className="text-xl text-gray-400 font-normal max-w-2xl mx-auto" style={{ 
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif"
                }}>
                    {isEditing
                        ? 'Update your avatar and personality settings'
                        : 'Your avatar will persist in the metaverse even when you\'re offline'
                    }
                </p>
            </div>

            {/* Apple-style progress indicators */}
            <div className="flex items-center justify-center gap-3 mb-10">
                <div className={`h-1.5 rounded-full transition-all duration-500 ${step >= 1 ? 'w-24 bg-gradient-to-r from-purple-500 to-indigo-500' : 'w-16 bg-gray-700'}`} />
                <div className={`h-1.5 rounded-full transition-all duration-500 ${step >= 2 ? 'w-24 bg-gradient-to-r from-purple-500 to-indigo-500' : 'w-16 bg-gray-700'}`} />
                <div className={`h-1.5 rounded-full transition-all duration-500 ${step >= 3 ? 'w-24 bg-gradient-to-r from-purple-500 to-indigo-500' : 'w-16 bg-gray-700'}`} />
            </div>

            {/* Main content card */}
            <Card className="border-0 bg-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden" style={{
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                borderRadius: '24px'
            }}>
            <CardHeader className="pb-8 pt-10 px-10">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-lg font-semibold shadow-lg">
                        {step}
                    </div>
                    <CardTitle className="text-2xl font-semibold text-white" style={{ 
                        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
                        letterSpacing: '-0.02em'
                    }}>
                        {step === 1 ? 'Identity' : step === 2 ? 'Choose Avatar' : 'Personality'}
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="px-10 pb-10 pt-2">
                {/* Step 1: Username */}
                {step === 1 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-300 block" style={{ 
                                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
                            }}>
                                Choose Your Username
                            </label>
                            <Input
                                type="text"
                                placeholder="Enter username..."
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="h-14 px-4 text-lg bg-gray-900/90 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:bg-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all duration-200"
                                style={{ 
                                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
                                }}
                                maxLength={20}
                            />
                            <p className="text-sm text-gray-400 flex items-center gap-2" style={{ 
                                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
                            }}>
                                <span className="text-purple-400">•</span>
                                This is how others will know you in the metaverse
                            </p>
                        </div>

                        <Button
                            onClick={() => username.trim() && setStep(2)}
                            className="w-full h-14 text-base font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0 rounded-xl shadow-lg hover:shadow-purple-500/50 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ 
                                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
                            }}
                            disabled={!username.trim()}
                        >
                            Continue
                        </Button>
                    </div>
                )}

                {/* Step 2: Avatar Selection */}
                {step === 2 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-4">
                            <label className="text-sm font-medium text-gray-300 block" style={{ 
                                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
                            }}>
                                Select Your Avatar
                            </label>
                            <div className="grid grid-cols-4 gap-3">
                                {avatarOptions.map(avatar => (
                                    <button
                                        key={avatar.id}
                                        onClick={() => setSelectedAvatar(avatar.model)}
                                        className={`group relative p-3 rounded-2xl transition-all duration-300 ${
                                            selectedAvatar === avatar.model
                                                ? 'bg-gradient-to-br from-purple-600/30 to-indigo-600/30 ring-2 ring-purple-500 shadow-lg shadow-purple-500/30'
                                                : 'bg-white/5 hover:bg-white/10 border border-white/10'
                                        }`}
                                        style={{ backdropFilter: 'blur(20px)' }}
                                    >
                                        <div className="aspect-square mb-2 rounded-xl overflow-hidden">
                                            <img 
                                                src={avatar.preview} 
                                                alt={avatar.name}
                                                className={`w-full h-full object-cover transition-transform duration-300 ${
                                                    selectedAvatar === avatar.model ? 'scale-105' : 'group-hover:scale-110'
                                                }`}
                                            />
                                        </div>
                                        <div className="text-xs font-medium text-gray-300 text-center" style={{ 
                                            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
                                        }}>
                                            {avatar.name}
                                        </div>
                                        {selectedAvatar === avatar.model && (
                                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                                                <span className="text-white text-xs">✓</span>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                onClick={() => setStep(1)}
                                variant="outline"
                                className="flex-1 h-14 bg-white/5 hover:bg-white/10 border border-white/20 text-white rounded-xl transition-all duration-200"
                                style={{ 
                                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
                                }}
                            >
                                Back
                            </Button>
                            <Button
                                onClick={() => setStep(3)}
                                className="flex-1 h-14 text-base font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0 rounded-xl shadow-lg hover:shadow-purple-500/50 transition-all duration-300"
                                style={{ 
                                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
                                }}
                            >
                                Continue
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 3: Personality */}
                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-4">
                            <label className="text-sm font-medium text-gray-300 block" style={{ 
                                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
                            }}>
                                Personality Type
                            </label>
                            <div className="space-y-2">
                                {personalityTemplates.map((template) => (
                                    <button
                                        key={template.label}
                                        onClick={() => {
                                            if (template.label === 'Custom') {
                                                setIsCustomPersonality(true);
                                            } else {
                                                setIsCustomPersonality(false);
                                                setPersonality(template.value);
                                            }
                                        }}
                                        className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                                            (template.label === 'Custom' && isCustomPersonality) ||
                                            (!isCustomPersonality && personality === template.value)
                                                ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 ring-2 ring-purple-500'
                                                : 'bg-white/5 hover:bg-white/10 border border-white/10'
                                        }`}
                                        style={{ backdropFilter: 'blur(20px)' }}
                                    >
                                        <div className="text-white text-sm font-semibold mb-1" style={{ 
                                            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
                                        }}>
                                            {template.label}
                                        </div>
                                        {template.value && (
                                            <div className="text-xs text-gray-400" style={{ 
                                                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
                                            }}>
                                                {template.value}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                            {isCustomPersonality && (
                                <Textarea
                                    placeholder="Describe your personality..."
                                    value={personality}
                                    onChange={(e) => setPersonality(e.target.value)}
                                    className="mt-3 p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-gray-500 focus:bg-white/15 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                                    style={{ 
                                        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
                                        backdropFilter: 'blur(20px)'
                                    }}
                                    rows={3}
                                    maxLength={10000}
                                />
                            )}
                        </div>

                        <div className="space-y-4">
                            <label className="text-sm font-medium text-gray-300 block" style={{ 
                                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
                            }}>
                                Interests <span className="text-gray-500">({interests.length}/5)</span>
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {interestOptions.map((interest) => (
                                    <button
                                        key={interest}
                                        onClick={() => {
                                            if (interests.includes(interest)) {
                                                setInterests(interests.filter(i => i !== interest));
                                            } else if (interests.length < 5) {
                                                setInterests([...interests, interest]);
                                            }
                                        }}
                                        className={`p-3 text-sm rounded-xl transition-all duration-200 font-medium ${
                                            interests.includes(interest)
                                                ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 ring-2 ring-purple-500 text-white'
                                                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400'
                                        }`}
                                        style={{ 
                                            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
                                            backdropFilter: 'blur(20px)'
                                        }}
                                        disabled={!interests.includes(interest) && interests.length >= 5}
                                    >
                                        {interest}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-sm font-medium text-gray-300 block" style={{ 
                                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
                            }}>
                                About You
                            </label>
                            <Textarea
                                placeholder="Tell others about yourself..."
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                className="p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-gray-500 focus:bg-white/15 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                                style={{ 
                                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
                                    backdropFilter: 'blur(20px)'
                                }}
                                rows={5}
                                maxLength={100000}
                            />
                            <p className="text-xs text-gray-500" style={{ 
                                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
                            }}>
                                {bio.length.toLocaleString()} characters
                            </p>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                onClick={() => setStep(2)}
                                variant="outline"
                                className="flex-1 h-14 bg-white/5 hover:bg-white/10 border border-white/20 text-white rounded-xl transition-all duration-200"
                                style={{ 
                                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
                                }}
                            >
                                Back
                            </Button>
                            <Button
                                onClick={handleCreateProfile}
                                disabled={isCreating}
                                className="flex-1 h-14 text-base font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0 rounded-xl shadow-lg hover:shadow-purple-500/50 transition-all duration-300 disabled:opacity-50"
                                style={{ 
                                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
                                }}
                            >
                                {isCreating
                                    ? (isEditing ? 'Updating...' : 'Creating...')
                                    : (isEditing ? 'Update Profile' : 'Create Profile')
                                }
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
        </div>
    );
};

export default ProfileCreator;