import React from 'react';

/**
 * ChildLearningAnimation
 * A background animation depicting a child learning under a soft ambient lamp/moonlight,
 * with warm shimmering light beams, a glowing book, floating letters & numbers,
 * and magical sparkles rising in the air.
 */
export default function ChildLearningAnimation({ mode = 'hero' }) {
  const isHero = mode === 'hero';

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none select-none overflow-hidden z-0 ${
        isHero ? 'opacity-90' : 'opacity-85'
      }`}
    >
      <style>{`
        /* Soft pulsing ambient lamp ray */
        @keyframes softLightPulse {
          0%, 100% {
            opacity: 0.38;
            transform: scale(1) rotate(0deg);
          }
          50% {
            opacity: 0.58;
            transform: scale(1.04) rotate(0.8deg);
          }
        }

        /* Gentle breathing of the child while reading */
        @keyframes childBreathe {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-2.5px) rotate(-0.5deg);
          }
        }

        /* Gentle head nod/tilt as child reads */
        @keyframes childHeadTilt {
          0%, 100% {
            transform: rotate(0deg);
          }
          35% {
            transform: rotate(1.8deg);
          }
          70% {
            transform: rotate(-1deg);
          }
        }

        /* Glowing magical book */
        @keyframes bookMagicGlow {
          0%, 100% {
            filter: drop-shadow(0 0 12px rgba(253, 224, 71, 0.75)) drop-shadow(0 0 24px rgba(245, 158, 11, 0.45));
            opacity: 0.95;
          }
          50% {
            filter: drop-shadow(0 0 22px rgba(254, 240, 138, 0.95)) drop-shadow(0 0 40px rgba(245, 158, 11, 0.65));
            opacity: 1;
          }
        }

        /* Light beam rays flicker */
        @keyframes rayShimmer {
          0%, 100% { opacity: 0.35; transform: skewX(-2deg); }
          50% { opacity: 0.65; transform: skewX(2deg); }
        }

        /* Floating learning items rising from the book into the light */
        @keyframes floatUpItem1 {
          0% {
            transform: translate(0, 0) scale(0.6) rotate(0deg);
            opacity: 0;
          }
          20% {
            opacity: 0.85;
          }
          80% {
            opacity: 0.75;
          }
          100% {
            transform: translate(-30px, -140px) scale(1.05) rotate(-15deg);
            opacity: 0;
          }
        }

        @keyframes floatUpItem2 {
          0% {
            transform: translate(0, 0) scale(0.5) rotate(0deg);
            opacity: 0;
          }
          25% {
            opacity: 0.9;
          }
          75% {
            opacity: 0.8;
          }
          100% {
            transform: translate(35px, -160px) scale(1.1) rotate(20deg);
            opacity: 0;
          }
        }

        @keyframes floatUpItem3 {
          0% {
            transform: translate(0, 0) scale(0.6) rotate(0deg);
            opacity: 0;
          }
          30% {
            opacity: 0.85;
          }
          85% {
            opacity: 0.65;
          }
          100% {
            transform: translate(10px, -180px) scale(1.15) rotate(-8deg);
            opacity: 0;
          }
        }

        @keyframes floatUpItem4 {
          0% {
            transform: translate(0, 0) scale(0.5) rotate(0deg);
            opacity: 0;
          }
          20% {
            opacity: 0.9;
          }
          80% {
            opacity: 0.7;
          }
          100% {
            transform: translate(-45px, -150px) scale(1) rotate(12deg);
            opacity: 0;
          }
        }

        /* Ambient floating dust sparkles */
        @keyframes dustMote1 {
          0%, 100% { transform: translate(0, 0); opacity: 0.2; }
          50% { transform: translate(15px, -25px); opacity: 0.75; }
        }
        @keyframes dustMote2 {
          0%, 100% { transform: translate(0, 0); opacity: 0.3; }
          50% { transform: translate(-20px, -30px); opacity: 0.85; }
        }
        @keyframes dustMote3 {
          0%, 100% { transform: translate(0, 0); opacity: 0.15; }
          50% { transform: translate(12px, -40px); opacity: 0.7; }
        }

        .anim-soft-light {
          animation: softLightPulse 6s ease-in-out infinite;
          transform-origin: top center;
        }
        .anim-child-body {
          animation: childBreathe 4.5s ease-in-out infinite;
          transform-origin: bottom center;
        }
        .anim-child-head {
          animation: childHeadTilt 5.5s ease-in-out infinite;
          transform-origin: 195px 145px;
        }
        .anim-book-glow {
          animation: bookMagicGlow 3.5s ease-in-out infinite;
        }
        .anim-ray-shimmer {
          animation: rayShimmer 5s ease-in-out infinite alternate;
          transform-origin: top center;
        }

        .anim-float-1 { animation: floatUpItem1 6s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .anim-float-2 { animation: floatUpItem2 7.5s cubic-bezier(0.4, 0, 0.2, 1) infinite 1.5s; }
        .anim-float-3 { animation: floatUpItem3 6.8s cubic-bezier(0.4, 0, 0.2, 1) infinite 3s; }
        .anim-float-4 { animation: floatUpItem4 8s cubic-bezier(0.4, 0, 0.2, 1) infinite 4.2s; }

        .anim-mote-1 { animation: dustMote1 4.5s ease-in-out infinite; }
        .anim-mote-2 { animation: dustMote2 6s ease-in-out infinite 1s; }
        .anim-mote-3 { animation: dustMote3 5.2s ease-in-out infinite 2.2s; }
      `}</style>

      {/* ── Soft Ambient Light Cones & Backdrop Glows ── */}
      <div
        className={`absolute rounded-full blur-[110px] pointer-events-none transition-all ${
          isHero
            ? 'top-[8%] left-[5%] md:left-[12%] w-[420px] h-[420px] bg-amber-300/18'
            : 'top-[12%] right-[5%] md:right-[15%] w-[400px] h-[400px] bg-amber-200/22'
        }`}
      />
      <div
        className={`absolute rounded-full blur-[130px] pointer-events-none ${
          isHero
            ? 'bottom-[10%] left-[2%] md:left-[8%] w-[500px] h-[400px] bg-indigo-400/20'
            : 'bottom-[8%] left-[8%] w-[450px] h-[380px] bg-sky-300/20'
        }`}
      />

      {/* ── Illustration Container: Child Learning in Soft Lamp Light ── */}
      <div
        className={`absolute transition-all duration-700 ${
          isHero
            ? 'bottom-2 md:bottom-6 left-2 sm:left-6 md:left-12 lg:left-16 w-[320px] sm:w-[380px] md:w-[440px] max-w-[90vw]'
            : 'bottom-4 sm:bottom-8 right-2 sm:right-6 md:right-14 w-[300px] sm:w-[360px] md:w-[420px] max-w-[85vw]'
        }`}
      >
        <svg
          viewBox="0 0 460 360"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto drop-shadow-[0_15px_35px_rgba(0,0,0,0.35)]"
        >
          <defs>
            {/* Soft Ambient Light Beam Gradients */}
            <radialGradient id="lampBulbGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fffbeb" stopOpacity="1" />
              <stop offset="35%" stopColor="#fde047" stopOpacity="0.85" />
              <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="softLightBeam" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.55" />
              <stop offset="30%" stopColor="#fde68a" stopOpacity="0.32" />
              <stop offset="70%" stopColor="#fed7aa" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#fde047" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="bookRadiance" x1="50%" y1="100%" x2="50%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="40%" stopColor="#fef08a" stopOpacity="0.7" />
              <stop offset="80%" stopColor="#67e8f9" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </linearGradient>

            {/* Child & Furniture Gradients */}
            <linearGradient id="lampMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="60%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            <linearGradient id="deskWood" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#64748b" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0.85" />
            </linearGradient>

            <linearGradient id="childBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>

            <linearGradient id="childHairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            <filter id="glowFilter" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ── Floor / Base Soft Shadow ── */}
          <ellipse cx="230" cy="335" rx="190" ry="14" fill="#020617" fillOpacity="0.35" />

          {/* ── Cone of Soft Ambient Lamp Light ── */}
          <g className="anim-soft-light">
            {/* Outer soft ambient spread */}
            <polygon
              points="110,48 40,325 350,325"
              fill="url(#softLightBeam)"
              opacity="0.6"
            />
            {/* Core bright light cone */}
            <polygon
              points="110,48 100,325 295,325"
              fill="url(#softLightBeam)"
              opacity="0.8"
            />
          </g>

          {/* Shimmering Ambient Light Ray */}
          <g className="anim-ray-shimmer">
            <polygon
              points="110,48 150,320 250,320"
              fill="url(#softLightBeam)"
              opacity="0.45"
            />
          </g>

          {/* ── Desk & Study Setup ── */}
          {/* Desk Surface */}
          <rect
            x="110"
            y="260"
            width="220"
            height="12"
            rx="5"
            fill="url(#deskWood)"
          />
          {/* Desk Legs */}
          <line x1="130" y1="272" x2="125" y2="335" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
          <line x1="310" y1="272" x2="315" y2="335" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />

          {/* Stack of colorful study books on side of desk */}
          <rect x="270" y="246" width="46" height="7" rx="2" fill="#ef4444" opacity="0.85" />
          <rect x="272" y="238" width="43" height="7" rx="2" fill="#3b82f6" opacity="0.85" />
          <rect x="269" y="230" width="48" height="7" rx="2" fill="#10b981" opacity="0.85" />
          {/* Pencil cup on desk */}
          <rect x="122" y="234" width="16" height="26" rx="3" fill="#64748b" opacity="0.7" />
          <line x1="126" y1="234" x2="123" y2="222" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
          <line x1="132" y1="234" x2="135" y2="218" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" />

          {/* ── The Study Lamp (Light Source) ── */}
          {/* Lamp Base on desk */}
          <ellipse cx="110" cy="258" rx="14" ry="4" fill="url(#lampMetal)" />
          {/* Lamp Curved Arm */}
          <path
            d="M 110 258 C 110 200, 85 110, 105 52"
            fill="none"
            stroke="url(#lampMetal)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Lamp Shade */}
          <path
            d="M 94 48 L 126 48 L 138 72 L 82 72 Z"
            fill="url(#lampMetal)"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          {/* Lamp Bulb & Glowing Orb */}
          <circle cx="110" cy="70" r="8" fill="#fffbeb" />
          <circle cx="110" cy="70" r="26" fill="url(#lampBulbGlow)" />

          {/* ── Chair & Child Learner ── */}
          {/* Chair back & seat */}
          <rect x="220" y="268" width="55" height="8" rx="3" fill="#1e293b" />
          <line x1="265" y1="230" x2="265" y2="270" stroke="#334155" strokeWidth="5" strokeLinecap="round" />
          <line x1="230" y1="276" x2="226" y2="335" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
          <line x1="265" y1="276" x2="268" y2="335" stroke="#0f172a" strokeWidth="5" strokeLinecap="round" />

          {/* Child Group with gentle breathing motion */}
          <g className="anim-child-body">
            {/* Legs */}
            <path
              d="M 235 272 L 235 315 L 245 315"
              fill="none"
              stroke="#1e1b4b"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Torso / Sweater with warm ambient rim lighting */}
            <path
              d="M 220 268 C 215 235, 205 200, 195 185 C 185 178, 175 195, 172 215 C 168 235, 185 268, 220 268 Z"
              fill="url(#childBodyGrad)"
              stroke="#a5b4fc"
              strokeWidth="1.5"
              strokeOpacity="0.6"
            />

            {/* Arm reaching toward the book on the desk */}
            <path
              d="M 188 198 Q 175 225, 182 254 L 202 257"
              fill="none"
              stroke="#818cf8"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Hand on open book */}
            <circle cx="202" cy="257" r="5" fill="#fbcfe8" />

            {/* Head tilted down reading */}
            <g className="anim-child-head">
              {/* Neck */}
              <rect x="189" y="170" width="8" height="12" rx="3" fill="#fbcfe8" />
              {/* Head / Face */}
              <circle cx="193" cy="158" r="16" fill="#fbcfe8" />
              {/* Cute hair */}
              <path
                d="M 178 156 C 176 142, 190 136, 204 138 C 212 140, 214 150, 210 160 C 205 154, 198 150, 188 152 Z"
                fill="url(#childHairGrad)"
              />
              {/* Soft eye focused on the book */}
              <ellipse cx="187" cy="160" rx="1.8" ry="1" fill="#1e1b4b" />
              {/* Happy learning smile */}
              <path
                d="M 184 167 Q 188 170, 192 168"
                fill="none"
                stroke="#fda4af"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </g>
          </g>

          {/* ── Open Glowing Book on Desk ── */}
          {/* Light cone beam rising directly from the book pages */}
          <polygon
            points="185,258 225,258 245,160 165,160"
            fill="url(#bookRadiance)"
            opacity="0.45"
            className="anim-book-glow"
          />

          {/* Open Book Pages */}
          <g className="anim-book-glow">
            {/* Book cover / shadow */}
            <path
              d="M 172 262 Q 205 264, 238 262 L 235 258 Q 205 260, 175 258 Z"
              fill="#1e1b4b"
            />
            {/* Left Page */}
            <path
              d="M 174 259 Q 190 254, 205 259 L 205 255 Q 190 250, 174 255 Z"
              fill="#ffffff"
              stroke="#fef08a"
              strokeWidth="0.8"
            />
            {/* Right Page */}
            <path
              d="M 205 259 Q 220 254, 236 259 L 236 255 Q 220 250, 205 255 Z"
              fill="#ffffff"
              stroke="#fef08a"
              strokeWidth="0.8"
            />
            {/* Text lines on book */}
            <line x1="178" y1="256" x2="200" y2="256" stroke="#93c5fd" strokeWidth="0.8" strokeOpacity="0.8" />
            <line x1="210" y1="256" x2="232" y2="256" stroke="#93c5fd" strokeWidth="0.8" strokeOpacity="0.8" />
            {/* Center spine glow */}
            <circle cx="205" cy="256" r="3" fill="#fef08a" filter="url(#glowFilter)" />
          </g>

          {/* ── Floating Learning Elements Rising from the Glowing Book ── */}
          {/* Element 1: Letter A */}
          <g transform="translate(195, 240)" className="anim-float-1">
            <rect x="-10" y="-10" width="20" height="20" rx="6" fill="#fef08a" fillOpacity="0.25" />
            <text
              x="0"
              y="5"
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
              fill="#fef08a"
              filter="url(#glowFilter)"
            >
              A
            </text>
          </g>

          {/* Element 2: Number 1 or Star */}
          <g transform="translate(210, 242)" className="anim-float-2">
            <text
              x="0"
              y="0"
              textAnchor="middle"
              fontSize="15"
              fontWeight="bold"
              fill="#93c5fd"
              filter="url(#glowFilter)"
            >
              ★
            </text>
          </g>

          {/* Element 3: Fidel letter "ሀ" or Letter "B" */}
          <g transform="translate(185, 238)" className="anim-float-3">
            <text
              x="0"
              y="0"
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
              fill="#f472b6"
              filter="url(#glowFilter)"
            >
              ሀ
            </text>
          </g>

          {/* Element 4: Sparkle ✦ */}
          <g transform="translate(220, 235)" className="anim-float-4">
            <text
              x="0"
              y="0"
              textAnchor="middle"
              fontSize="13"
              fill="#6ee7b7"
              filter="url(#glowFilter)"
            >
              ✦
            </text>
          </g>

          {/* ── Ambient Soft Glowing Dust Motes in Light Beam ── */}
          <circle cx="145" cy="180" r="2" fill="#fef08a" opacity="0.6" className="anim-mote-1" />
          <circle cx="170" cy="130" r="2.5" fill="#fef08a" opacity="0.8" className="anim-mote-2" />
          <circle cx="215" cy="110" r="1.8" fill="#ffffff" opacity="0.7" className="anim-mote-3" />
          <circle cx="130" cy="220" r="1.5" fill="#fef08a" opacity="0.5" className="anim-mote-2" />
          <circle cx="240" cy="170" r="2.2" fill="#fed7aa" opacity="0.6" className="anim-mote-1" />
          <circle cx="160" cy="210" r="2" fill="#ffffff" opacity="0.75" className="anim-mote-3" />
        </svg>
      </div>

      {/* ── Secondary Subtle Floating Symbols in Wide Background ── */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none">
        <span
          className="absolute top-[25%] left-[8%] text-amber-200/35 text-2xl font-bold anim-float-1"
          style={{ animationDuration: '9s' }}
        >
          ✨
        </span>
        <span
          className="absolute top-[35%] right-[12%] text-indigo-200/30 text-xl font-bold anim-float-2"
          style={{ animationDuration: '11s' }}
        >
          📖
        </span>
        <span
          className="absolute top-[65%] right-[8%] text-amber-100/30 text-2xl font-bold anim-float-3"
          style={{ animationDuration: '10s' }}
        >
          ⋆
        </span>
        <span
          className="absolute top-[18%] left-[28%] text-yellow-200/35 text-lg font-bold anim-float-4"
          style={{ animationDuration: '8.5s' }}
        >
          ✦
        </span>
      </div>
    </div>
  );
}

