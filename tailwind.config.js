/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './entrypoints/**/*.{html,ts,vue}',
        './components/**/*.{ts,vue}',
        './lib/**/*.{ts,vue}',
    ],
    theme: {
        extend: {
            colors: {
                // Obsidian / dragon palette used by obsidian-theme.css
                'obsidian-void': '#050505',
                'obsidian-void-lite': '#121212',
                'obsidian-void-shard': '#2a2a2a',
                'dragon-breath': '#00f2ff',
                'dragon-breath-purple': '#7c3aed',
                'ember-gold': '#ff8a00',
                'ember-gold-emerald': '#10b981',
                // Ethereal Palette - 动态情绪色
                'ether': {
                    dark: '#050505',      // 深空黑
                    mist: '#1a1a1a',      // 薄雾灰
                    light: '#ffffff',     // 纯净光
                },
                // 情绪状态色 (Status Moods)
                'mood': {
                    calm: '#6366f1',      // 平静/空闲 (Indigo)
                    active: '#8b5cf6',    // 活跃/思考 (Violet)
                    success: '#10b981',   // 成功/喜悦 (Emerald)
                    error: '#f43f5e',     // 错误/愤怒 (Rose)
                }
            },
            boxShadow: {
                'crystal-inner': 'inset 0 1px 0 0 rgba(255,255,255,0.08), inset 0 -1px 0 0 rgba(0,0,0,0.5)',
                'dragon-glow': '0 0 24px -8px rgba(0, 242, 255, 0.8)',
                'dragon-glow-intense': '0 0 36px -8px rgba(0, 242, 255, 1)',
                shard: '0 8px 24px -14px rgba(0,0,0,0.8)',
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'float-delayed': 'float 6s ease-in-out 3s infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'breathe': 'breathe 5s ease-in-out infinite',
                'blob': 'blob 7s infinite',
                shine: 'shine 1.6s ease-out',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                breathe: {
                    '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
                    '50%': { transform: 'scale(1.05)', opacity: '1' },
                },
                blob: {
                    '0%': { transform: 'translate(0px, 0px) scale(1)' },
                    '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
                    '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
                    '100%': { transform: 'translate(0px, 0px) scale(1)' },
                },
                shine: {
                    '0%': { transform: 'translateX(-120%) skewX(-12deg)' },
                    '100%': { transform: 'translateX(120%) skewX(-12deg)' },
                },
            },
            backdropBlur: {
                'xs': '2px',
            }
        },
    },
    plugins: [],
}
