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
            <Card className="w-full max-w-md mx-auto card-3d glass-3d neon-border relative overflow-hidden" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {/* Holographic overlay */}
                <div className="holographic absolute inset-0 pointer-events-none opacity-30 rounded-lg" />
                
                <CardContent className="p-8 text-center relative z-10 bounce-in">
                    <div className="float-3d mb-6">
                        <h2 className="text-4xl font-black tracking-tight mb-2" style={{ 
                            fontFamily: "'Orbitron', sans-serif",
                            background: 'linear-gradient(135deg, #00f5ff 0%, #a78bfa 50%, #ec4899 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Welcome back, {profile.username}! 👋
                        </h2>
                    </div>
                    <p className="text-xl font-semibold mb-6" style={{ 
                        fontFamily: "'Exo 2', sans-serif",
                        background: 'linear-gradient(90deg, #60efff 0%, #c084fc 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        ✨ Your digital twin is ready to explore the metaverse.
                    </p>
                    <Button 
                        onClick={onComplete} 
                        className="w-full btn-3d gradient-animated neon-border h-14 text-lg font-black tracking-wide"
                        style={{ fontFamily: "'Orbitron', sans-serif" }}
                    >
                        🚀 Enter YNGO
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-2xl mx-auto card-3d glass-3d neon-border max-h-[90vh] overflow-hidden flex flex-col relative" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {/* Holographic overlay */}
            <div className="holographic absolute inset-0 pointer-events-none opacity-30 rounded-lg" />
            
            <CardHeader className="flex-shrink-0 relative z-10">
                <CardTitle className="text-4xl text-center font-black tracking-tight" style={{ 
                    fontFamily: "'Orbitron', sans-serif",
                    background: 'linear-gradient(135deg, #00f5ff 0%, #a78bfa 25%, #ec4899 50%, #fbbf24 75%, #00f5ff 100%)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    animation: 'gradient-shift 3s linear infinite'
                }}>
                    {isEditing ? '✨ Edit Your Profile' : '🌟 Create Your Digital Twin'}
                </CardTitle>
                <p className="text-center text-lg font-semibold mt-2" style={{ 
                    fontFamily: "'Exo 2', sans-serif",
                    background: 'linear-gradient(90deg, #60efff 0%, #c084fc 50%, #f472b6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    {isEditing
                        ? 'Update your avatar and personality settings'
                        : 'Your avatar will persist in the metaverse even when you\'re offline!'
                    }
                </p>
                <div className="flex justify-center gap-3 mt-6">
                    <Badge 
                        variant={step === 1 ? "default" : "outline"}
                        className={step === 1 ? "card-3d gradient-animated neon-border px-4 py-2 font-bold" : "glass-3d border-cyan-500/50 px-4 py-2 font-semibold"}
                        style={{ fontFamily: "'Orbitron', sans-serif" }}
                    >
                        <span className="neon-text">1. Identity</span>
                    </Badge>
                    <Badge 
                        variant={step === 2 ? "default" : "outline"}
                        className={step === 2 ? "card-3d gradient-animated neon-border px-4 py-2 font-bold" : "glass-3d border-purple-500/50 px-4 py-2 font-semibold"}
                        style={{ fontFamily: "'Orbitron', sans-serif" }}
                    >
                        <span className="neon-text">2. Avatar</span>
                    </Badge>
                    <Badge 
                        variant={step === 3 ? "default" : "outline"}
                        className={step === 3 ? "card-3d gradient-animated neon-border px-4 py-2 font-bold" : "glass-3d border-pink-500/50 px-4 py-2 font-semibold"}
                        style={{ fontFamily: "'Orbitron', sans-serif" }}
                    >
                        <span className="neon-text">3. Personality</span>
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-6 flex-1 overflow-y-auto relative z-10">
                {/* Step 1: Username */}
                {step === 1 && (
                    <div className="space-y-6 bounce-in">
                        <div className="card-3d glass-3d p-6 neon-border">
                            <label className="text-lg font-semibold bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent mb-3 block">
                                ✨ Choose Your Username
                            </label>
                            <Input
                                type="text"
                                placeholder="Enter username..."
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="glass-3d neon-border text-white text-lg font-medium placeholder:text-cyan-300/50 h-14"
                                maxLength={20}
                            />
                            <p className="text-sm text-cyan-200/70 mt-3 font-medium">
                                💫 This is how others will know you in the metaverse
                            </p>
                        </div>

                        {/* Greeting field removed */}

                        <Button
                            onClick={() => username.trim() && setStep(2)}
                            className="w-full btn-3d gradient-animated neon-border h-14 text-lg font-bold"
                            disabled={!username.trim()}
                        >
                            Next: Choose Avatar →
                        </Button>
                    </div>
                )}

                {/* Step 2: Avatar Selection */}
                {step === 2 && (
                    <div className="space-y-6 bounce-in">
                        <div className="card-3d glass-3d p-6 neon-border">
                            <label className="text-lg font-semibold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent mb-4 block">
                                👤 Select Your Avatar
                            </label>
                            <div className="grid grid-cols-4 gap-4">
                                {avatarOptions.map(avatar => (
                                    <button
                                        key={avatar.id}
                                        onClick={() => setSelectedAvatar(avatar.model)}
                                        className={`p-4 rounded-lg border-2 transition-all duration-300 card-hover-3d ${
                                            selectedAvatar === avatar.model
                                                ? 'neon-border gradient-animated scale-110'
                                                : 'border-cyan-500/30 glass-3d hover:border-cyan-400/60'
                                        }`}
                                    >
                                        <div className={selectedAvatar === avatar.model ? 'float-3d' : ''}>
                                            <img 
                                                src={avatar.preview} 
                                                alt={avatar.name}
                                                className="w-16 h-16 object-cover rounded-lg mb-2 mx-auto"
                                            />
                                            <div className="text-xs font-bold neon-text">{avatar.name}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                onClick={() => setStep(1)}
                                variant="outline"
                                className="flex-1 glass-3d border-cyan-500/50 hover:border-cyan-400 h-12 text-base font-semibold"
                            >
                                ← Back
                            </Button>
                            <Button
                                onClick={() => setStep(3)}
                                className="flex-1 btn-3d gradient-animated neon-border h-12 text-base font-bold"
                            >
                                Next: Personality →
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 3: Personality */}
                {step === 3 && (
                    <div className="space-y-6 bounce-in">
                        <div className="card-3d glass-3d p-6 neon-border">
                            <label className="text-lg font-semibold bg-gradient-to-r from-pink-300 to-orange-300 bg-clip-text text-transparent mb-3 block">
                                🎭 Personality
                            </label>
                            <div className="space-y-2 mb-3">
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
                                        className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-300 card-hover-3d ${
                                            (template.label === 'Custom' && isCustomPersonality) ||
                                            (!isCustomPersonality && personality === template.value)
                                                ? 'neon-border gradient-animated'
                                                : 'border-purple-500/30 glass-3d hover:border-purple-400/60'
                                        }`}
                                    >
                                        <div className="text-white text-sm font-bold neon-text">{template.label}</div>
                                        {template.value && (
                                            <div className="text-xs text-cyan-200/70 mt-1">{template.value}</div>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <Textarea
                                placeholder="Describe your personality..."
                                value={personality}
                                onChange={(e) => setPersonality(e.target.value)}
                                className="glass-3d neon-border text-white font-medium placeholder:text-purple-300/50"
                                rows={3}
                                maxLength={10000}
                            />
                            <p className="text-xs text-cyan-200/70 mt-2 font-medium">{personality.length}/10,000 characters</p>
                        </div>

                        <div className="card-3d glass-3d p-6 neon-border">
                            <label className="text-lg font-semibold bg-gradient-to-r from-green-300 to-cyan-300 bg-clip-text text-transparent mb-3 block">
                                ❤️ Interests (select up to 5)
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
                                        className={`p-2 text-xs rounded-lg border-2 transition-all duration-300 font-semibold ${
                                            interests.includes(interest)
                                                ? 'neon-border gradient-animated scale-105'
                                                : 'border-cyan-500/30 glass-3d hover:border-cyan-400/60 text-gray-300'
                                        }`}
                                        disabled={!interests.includes(interest) && interests.length >= 5}
                                    >
                                        {interest}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="card-3d glass-3d p-6 neon-border">
                            <label className="text-lg font-semibold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent mb-3 block">
                                📝 Background
                            </label>
                            <Textarea
                                placeholder="Tell others about yourself... (feel free to copy and paste your resume)"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                className="glass-3d neon-border text-white font-medium placeholder:text-blue-300/50"
                                rows={6}
                                maxLength={100000}
                            />
                            <p className="text-xs text-cyan-200/70 mt-2 font-medium">{bio.length}/100,000</p>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                onClick={() => setStep(2)}
                                variant="outline"
                                className="flex-1 glass-3d border-purple-500/50 hover:border-purple-400 h-12 text-base font-semibold"
                            >
                                ← Back
                            </Button>
                            <Button
                                onClick={handleCreateProfile}
                                disabled={isCreating}
                                className="flex-1 btn-3d gradient-animated neon-border h-12 text-base font-bold"
                            >
                                {isCreating
                                    ? (isEditing ? '⏳ Updating...' : '⏳ Creating...')
                                    : (isEditing ? '✅ Update Profile' : '🚀 Create Digital Twin')
                                }
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ProfileCreator;