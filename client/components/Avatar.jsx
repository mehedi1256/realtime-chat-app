'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
  'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500',
];

export default function Avatar({ user, size = 'md', showOnline = false }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const onlineDotSizes = {
    sm: 'w-2.5 h-2.5 border',
    md: 'w-3 h-3 border-2',
    lg: 'w-3.5 h-3.5 border-2',
    xl: 'w-4 h-4 border-2',
  };

  const getColorFromName = (name) => {
    if (!name) return COLORS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLORS[Math.abs(hash) % COLORS.length];
  };

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <div className="relative flex-shrink-0">
      {user?.profilePicture ? (
        <img
          src={`${API_URL}${user.profilePicture}`}
          alt={user.name}
          className={`${sizeClasses[size]} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} ${getColorFromName(user?.name)} rounded-full flex items-center justify-center text-white font-semibold`}
        >
          {initials}
        </div>
      )}
      {showOnline && user?.isOnline && (
        <span
          className={`absolute bottom-0 right-0 ${onlineDotSizes[size]} bg-green-500 rounded-full border-white dark:border-gray-800`}
        />
      )}
    </div>
  );
}
