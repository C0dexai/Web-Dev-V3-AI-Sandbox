import React, { useState } from 'react';
import type { ChatMessage } from '../types';
import { GeminiIcon, UserCircleIcon, CheckIcon, CopyIcon, LightbulbIcon } from './Icons';
import ChatContentParser from './ChatContentParser';

interface ChatMessageProps {
    message: ChatMessage;
    onApplyCode: (code: { path: string; content: string }[]) => void;
    onSuggestionClick: (suggestion: string) => void;
}

const ChatMessageView: React.FC<ChatMessageProps> = ({ message, onApplyCode, onSuggestionClick }) => {
    const [isCopied, setIsCopied] = useState(false);

    if (message.role === 'system') {
        return (
            <div className="text-center my-4">
                <p className="text-xs text-gray-500 italic px-4 py-1 bg-black/20 rounded-full inline-block">
                    {message.content}
                </p>
            </div>
        );
    }
    
    const getRoleStyles = () => {
        switch (message.role) {
            case 'model':
                return {
                    container: '',
                    iconContainer: 'bg-[var(--neon-purple)]',
                    icon: <GeminiIcon className="h-5 w-5 text-black" />,
                    bubble: 'bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--neon-purple)] text-[var(--text-color)]',
                    glow: 'neon-glow-purple',
                };
            case 'user':
            default:
                return {
                    container: 'flex-row-reverse',
                    iconContainer: 'bg-[var(--neon-blue)]',
                    icon: <UserCircleIcon className="h-5 w-5 text-black" />,
                    bubble: 'bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--neon-blue)] text-[var(--text-color)]',
                    glow: 'neon-glow-blue',
                };
        }
    };

    const handleCopy = () => {
        const textToCopy = message.role === 'model' 
            ? (message.explanation || message.content) 
            : message.content;
            
        navigator.clipboard.writeText(textToCopy).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };
    
    const styles = getRoleStyles();

    return (
        <div className={`flex items-start gap-3 my-4 ${styles.container}`}>
            <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${styles.iconContainer} ${styles.glow}`}>
                {styles.icon}
            </div>
            <div className={`p-4 rounded-2xl max-w-xl relative group ${styles.bubble}`}>
                <button 
                    onClick={handleCopy}
                    className="absolute top-2 right-2 p-1.5 bg-black/20 hover:bg-black/40 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={isCopied ? "Copied!" : "Copy text"}
                >
                    {isCopied ? <CheckIcon className="h-4 w-4 text-[var(--neon-green)]" /> : <CopyIcon className="h-4 w-4 text-gray-300" />}
                </button>
                
                 <ChatContentParser 
                    content={message.role === 'model' ? (message.explanation || message.content) : message.content}
                    codeSnippets={message.code}
                    onApplyCode={onApplyCode}
                 />

                {message.role === 'model' && message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, index) => (
                            <button
                                key={index}
                                onClick={() => onSuggestionClick(suggestion)}
                                className="flex items-center gap-2 text-xs px-3 py-1.5 bg-black/30 hover:bg-black/40 border border-[var(--card-border)] rounded-full transition-colors text-gray-300 hover:text-white"
                            >
                                <LightbulbIcon className="h-4 w-4 text-yellow-400" />
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatMessageView;