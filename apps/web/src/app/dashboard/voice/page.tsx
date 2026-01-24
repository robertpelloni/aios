"use client";

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/utils/trpc";

export default function VoicePage() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [lastResult, setLastResult] = useState("");
    const recognitionRef = useRef<any>(null);

    const replyMutation = trpc.executeTool.useMutation();

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            // @ts-ignore
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                if (finalTranscript) {
                    setTranscript(prev => prev + " " + finalTranscript);
                    handleCommand(finalTranscript);
                }
            };

            recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };

            recognition.onend = () => {
                if (isListening) {
                    recognition.start(); // Auto-restart if should be listening
                }
            };

            recognitionRef.current = recognition;
        }
    }, [isListening]);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    const handleCommand = async (text: string) => {
        console.log("Voice Command:", text);
        setLastResult(`Processing: "${text}"`);

        const lower = text.toLowerCase().trim();

        // Keyword Activation
        if (lower.startsWith("director") || lower.startsWith("computer") || lower.startsWith("borg")) {
            const prompt = lower.replace(/^(director|computer|borg)/, "").trim();
            if (prompt) {
                // Send to Core
                await replyMutation.mutateAsync({
                    name: "start_task",
                    args: { goal: prompt }
                });
                setLastResult(`Executed: "${prompt}"`);
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-center p-8 space-y-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 to-purple-600 bg-clip-text text-transparent">
                Voice Command
            </h1>

            <div
                onClick={toggleListening}
                className={`w-32 h-32 rounded-full border-4 flex items-center justify-center cursor-pointer transition-all duration-300 ${isListening ? 'border-red-500 bg-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.5)] scale-110' : 'border-zinc-700 bg-zinc-800 hover:border-zinc-500'}`}
            >
                <span className="text-4xl">{isListening ? '🎙️' : '🔇'}</span>
            </div>

            <div className="max-w-xl w-full">
                <p className="text-zinc-500 mb-2">TRANSCRIPT</p>
                <div className="h-32 bg-black/40 border border-zinc-800 rounded-xl p-4 overflow-y-auto font-mono text-sm text-zinc-300">
                    {transcript || "Say 'Director [command]'..."}
                </div>
            </div>

            {lastResult && (
                <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-4 py-2 rounded-lg">
                    {lastResult}
                </div>
            )}
        </div>
    );
}
