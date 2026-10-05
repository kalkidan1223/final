import { useState } from 'react';

const AVATAR_OPTIONS = [
  { id: 1, emoji: '👦', name: 'Boy' },
  { id: 2, emoji: '👧', name: 'Girl' },
  { id: 3, emoji: '🧒', name: 'Child' },
  { id: 4, emoji: '👶', name: 'Baby' },
  { id: 5, emoji: '🧑', name: 'Person' },
  { id: 6, emoji: '🦸', name: 'Superhero' },
  { id: 7, emoji: '🧙', name: 'Wizard' },
  { id: 8, emoji: '🧚', name: 'Fairy' },
  { id: 9, emoji: '🦊', name: 'Fox' },
  { id: 10, emoji: '🐱', name: 'Cat' },
  { id: 11, emoji: '🐶', name: 'Dog' },
  { id: 12, emoji: '🐰', name: 'Rabbit' },
];

const COLOR_OPTIONS = [
  { id: 1, name: 'Blue', bg: 'from-blue-400 to-blue-600', border: 'border-blue-300' },
  { id: 2, name: 'Purple', bg: 'from-purple-400 to-purple-600', border: 'border-purple-300' },
  { id: 3, name: 'Pink', bg: 'from-pink-400 to-pink-600', border: 'border-pink-300' },
  { id: 4, name: 'Green', bg: 'from-green-400 to-green-600', border: 'border-green-300' },
  { id: 5, name: 'Orange', bg: 'from-orange-400 to-orange-600', border: 'border-orange-300' },
  { id: 6, name: 'Teal', bg: 'from-teal-400 to-teal-600', border: 'border-teal-300' },
];

export default function ChildAvatar({ selectedAvatar, selectedColor, onAvatarChange, onColorChange, editable = false }) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    if (!editable) return;
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const currentAvatar = AVATAR_OPTIONS.find(a => a.id === selectedAvatar) || AVATAR_OPTIONS[0];
  const currentColor = COLOR_OPTIONS.find(c => c.id === selectedColor) || COLOR_OPTIONS[0];

  if (!editable) {
    // Display mode - just show the avatar
    return (
      <div
        className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br ${currentColor.bg} 
                   flex items-center justify-center text-4xl sm:text-5xl shadow-lg border-4 ${currentColor.border}
                   hover:scale-110 transition-transform duration-300 cursor-pointer`}
        onClick={handleClick}
      >
        <span className={isAnimating ? 'animate-pop' : ''}>{currentAvatar.emoji}</span>
      </div>
    );
  }

  // Edit mode - show selector
  return (
    <div className="space-y-6">
      {/* Current Avatar Preview */}
      <div className="flex flex-col items-center gap-4">
        <div
          className={`relative w-32 h-32 rounded-full bg-gradient-to-br ${currentColor.bg} 
                     flex items-center justify-center text-6xl shadow-2xl border-4 ${currentColor.border}
                     hover:scale-110 transition-transform duration-300 cursor-pointer animate-float`}
          onClick={handleClick}
        >
          <span className={isAnimating ? 'animate-pop' : ''}>{currentAvatar.emoji}</span>
        </div>
        <p className="text-sm font-bold text-gray-600">Your Avatar</p>
      </div>

      {/* Avatar Selector */}
      <div className="space-y-3">
        <h3 className="text-sm font-black text-gray-700 uppercase tracking-wide">Choose Your Character</h3>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {AVATAR_OPTIONS.map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => {
                onAvatarChange(avatar.id);
                handleClick();
              }}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-all duration-200
                         ${selectedAvatar === avatar.id
                           ? 'bg-gradient-to-br from-purple-400 to-pink-400 scale-110 shadow-lg ring-4 ring-purple-300'
                           : 'bg-gray-100 hover:bg-gray-200 hover:scale-105'
                         }`}
              title={avatar.name}
            >
              {avatar.emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Color Selector */}
      <div className="space-y-3">
        <h3 className="text-sm font-black text-gray-700 uppercase tracking-wide">Choose Your Color</h3>
        <div className="flex flex-wrap gap-3">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color.id}
              onClick={() => onColorChange(color.id)}
              className={`w-12 h-12 rounded-full bg-gradient-to-br ${color.bg} border-4
                         ${selectedColor === color.id ? color.border + ' scale-110 shadow-lg ring-4 ring-offset-2 ring-gray-300' : 'border-transparent hover:scale-105'}
                         transition-all duration-200`}
              title={color.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
