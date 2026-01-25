'use client';

import React, { useState, useEffect } from 'react';

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    isProcessing?: boolean;
}

export default function VoiceInput({ onTranscript, isProcessing }: VoiceInputProps) {
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);

    useEffect(() => {
        // Init Speech Recognition
        if (typeof window !== 'undefined') {
            // @ts-ignore
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const reco = new SpeechRecognition();
                reco.continuous = false;
                reco.interimResults = false;
                reco.lang = 'en-US';

                reco.onstart = () => setIsListening(true);
                reco.onend = () => setIsListening(false);
                reco.onresult = (event: any) => {
                    const text = event.results[0][0].transcript;
                    console.log('Voice Transcript:', text);
                    onTranscript(text);
                };
                reco.onerror = (event: any) => {
                    console.error('Speech Error:', event.error);
                    setIsListening(false);
                };

                setRecognition(reco);
            }
        }
    }, [onTranscript]);

    const toggleListening = () => {
        if (!recognition) {
            alert("Speech Recognition not supported in this browser.");
            return;
        }

        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    };

    return (
        <button
            onClick={toggleListening}
            disabled={isProcessing}
            className={`p-2 rounded-full transition-all duration-300 flex items-center justify-center ${isListening
                    ? 'bg-red-500/20 text-red-500 ring-2 ring-red-500 animate-pulse'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                }`}
            title="Toggle Voice Command"
        >
            {isListening ? (
                <span className="w-5 h-5">⏹</span>
            ) : (
                <span className="w-5 h-5">🎤</span>
            )}
        </button>
    );
}
