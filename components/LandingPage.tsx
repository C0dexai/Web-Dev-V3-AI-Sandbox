import React from 'react';

interface LandingPageProps {
    onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
    return (
        <div className="text-white h-screen flex flex-col items-center justify-center text-center p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto animate-fade-in-up">
                <div className="flex justify-center items-center gap-4 mb-6">
                    <img
                        src="https://andiegogiap.com/assets/aionex-icon-256.png"
                        alt="AIONEX"
                        width="128" height="128"
                        style={{height: '80px', width: 'auto', filter: 'drop-shadow(0 0 8px var(--neon-purple))'}}
                        loading="eager" decoding="async"
                    />
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tighter" style={{textShadow: '0 0 10px var(--neon-pink), 0 0 20px var(--neon-pink)'}}>
                        AIONEX Sandbox
                    </h1>
                </div>
                <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto" style={{textShadow: '0 0 5px black'}}>
                    Generate, refine, and preview web applications in a live environment powered by Google's Gemini AI.
                </p>
                <button
                    onClick={onEnter}
                    className="bg-[var(--neon-blue)] text-black font-bold py-3 px-8 rounded-lg text-lg hover:brightness-125 transition-all duration-300 transform hover:scale-105 neon-glow-blue"
                >
                    Enter Sandbox
                </button>

                <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                    <div className="bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--card-border)] backdrop-blur-xl">
                        <h3 className="text-xl font-bold text-[var(--neon-green)] mb-3">AI-Powered Development</h3>
                        <p className="text-gray-400">Instruct the AI agent to create files, write HTML, style with CSS/Tailwind, and add JavaScript functionality using natural language.</p>
                    </div>
                    <div className="bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--card-border)] backdrop-blur-xl">
                        <h3 className="text-xl font-bold text-[var(--neon-green)] mb-3">Live Preview & Editing</h3>
                        <p className="text-gray-400">See your changes reflected instantly. Click on any element in the preview to edit its code directly.</p>
                    </div>
                    <div className="bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--card-border)] backdrop-blur-xl">
                        <h3 className="text-xl font-bold text-[var(--neon-green)] mb-3">GitHub Integration</h3>
                        <p className="text-gray-400">Connect your GitHub account, load repositories, browse branches, and commit & push changes directly from the app.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;