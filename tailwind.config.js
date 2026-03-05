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
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'float-delayed': 'float 6s ease-in-out 3s infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'breathe': 'breathe 5s ease-in-out infinite',
                'blob': 'blob 7s infinite',
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
                }
            },
            backdropBlur: {
                'xs': '2px',
            }
        },
    },
    plugins: [],
}
