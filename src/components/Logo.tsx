export function LogoIcon({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background rounded square */}
      <rect width="64" height="64" rx="14" fill="url(#logo-grad)" />
      {/* Book shape */}
      <path
        d="M16 18C16 16.8954 16.8954 16 18 16H30C30 16 32 16 32 18V48C32 48 30 46 28 46H18C16.8954 46 16 45.1046 16 44V18Z"
        fill="rgba(255,255,255,0.25)"
      />
      <path
        d="M48 18C48 16.8954 47.1046 16 46 16H34C34 16 32 16 32 18V48C32 48 34 46 36 46H46C47.1046 46 48 45.1046 48 44V18Z"
        fill="rgba(255,255,255,0.35)"
      />
      {/* JSS letters */}
      <text
        x="32"
        y="37"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="16"
        fill="white"
        letterSpacing="1"
      >
        JSS
      </text>
      {/* Glow accent on top */}
      <circle cx="32" cy="12" r="3" fill="#67e8f9" opacity="0.8" />
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563eb" />
          <stop offset="0.5" stopColor="#0891b2" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function LogoFull({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LogoIcon size={size} />
      <div className="flex flex-col leading-none">
        <span
          className="font-bold tracking-tight"
          style={{ fontSize: size * 0.55 }}
        >
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400">
            James Study
          </span>
        </span>
        <span
          className="font-semibold text-gray-400 tracking-widest uppercase"
          style={{ fontSize: size * 0.28 }}
        >
          Studio
        </span>
      </div>
    </div>
  );
}

export function LogoFullDark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LogoIcon size={size} />
      <div className="flex flex-col leading-none">
        <span
          className="font-bold tracking-tight text-gray-900"
          style={{ fontSize: size * 0.55 }}
        >
          James Study
        </span>
        <span
          className="font-semibold text-gray-500 tracking-widest uppercase"
          style={{ fontSize: size * 0.28 }}
        >
          Studio
        </span>
      </div>
    </div>
  );
}
