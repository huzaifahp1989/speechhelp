
'use client';

import { useState } from 'react';
import { BookOpen, Clock, Target, Calendar, Sparkles, Brain, Copy, Check } from 'lucide-react';

export default function AiPromptGenerator() {
  const [inputs, setInputs] = useState({
    level: 'Beginner',
    time: '20',
    goal: 'Memorisation',
    startingPoint: '',
    targetTime: ''
  });

  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  const generatePrompt = () => {
    const prompt = `You are an Islamic Quran learning assistant specialised in Hifz (Quran memorisation).

Create a personalised Quran learning plan based on the following inputs:

User Level: ${inputs.level}
Time Available Per Day: ${inputs.time} minutes
Learning Goal: ${inputs.goal}
Starting Point: ${inputs.startingPoint || 'Not specified'}
Target Completion Time: ${inputs.targetTime || 'Not specified'}

Your response MUST include:

1. 📅 PERSONALISED LEARNING PLAN
- Daily and weekly breakdown
- Number of ayahs per day
- Revision days included
- Flexible plan for busy users

2. 📖 SELECTED QURAN PORTION
For the selected portion, show:
- Surah name
- Juz number
- Quarter (if applicable)
- Ayah numbers
- Full Arabic text
- Full English translation (clear & authentic)

3. 🕋 REASON OF REVELATION (ASBAB AL-NUZUL)
- Provide background or context of revelation if available
- If not available, clearly say: "No specific narration reported"

4. 🧠 MEMORISATION TIPS
- Practical Hifz techniques
- Tips for busy people
- Repetition methods
- Listening & recitation advice
- Retention and revision strategy

5. 🔁 REVISION STRATEGY
- Weekly revision plan
- Long-term retention advice
- For Huffaz: strengthening weak portions

6. 🤲 SPIRITUAL MOTIVATION
- Short Islamic motivation related to Quran learning
- Relevant hadith or Quranic encouragement (brief)

Formatting Rules:
- Use clear headings
- Arabic text should be separate and readable
- Keep tone encouraging and supportive
- Suitable for both Huffaz and non-Huffaz`;

    setGeneratedPrompt(prompt);
    setCopied(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-5 sm:p-8 space-y-5 sm:space-y-6">
            <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">AI Prompt Generator</h2>
                <p className="text-sm text-muted mt-1">Generate a prompt for ChatGPT or Claude to build your plan</p>
            </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Level */}
            <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-500" />
                Current Level
            </label>
            <select
                value={inputs.level}
                onChange={(e) => setInputs({ ...inputs, level: e.target.value })}
                className="w-full min-h-[48px] p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
                <option value="Beginner">Beginner (Learning to read/New to Hifz)</option>
                <option value="Intermediate">Intermediate (Knows some Surahs)</option>
                <option value="Hafiz">Hafiz (Completed memorization)</option>
            </select>
            </div>

            {/* Time */}
            <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500" />
                Time Per Day
            </label>
            <select
                value={inputs.time}
                onChange={(e) => setInputs({ ...inputs, time: e.target.value })}
                className="w-full min-h-[48px] p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
                <option value="10">10 Minutes</option>
                <option value="20">20 Minutes</option>
                <option value="30">30 Minutes</option>
                <option value="60">60 Minutes (1 Hour)</option>
                <option value="120">120 Minutes (2 Hours)</option>
            </select>
            </div>

            {/* Goal */}
            <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-500" />
                Learning Goal
            </label>
            <select
                value={inputs.goal}
                onChange={(e) => setInputs({ ...inputs, goal: e.target.value })}
                className="w-full min-h-[48px] p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
                <option value="Memorisation">Memorisation (New Hifz)</option>
                <option value="Revision">Revision (Reviewing old Hifz)</option>
                <option value="Memorisation with Understanding">Memorisation + Tafseer</option>
            </select>
            </div>

            {/* Target Time */}
            <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-500" />
                Target Completion (Optional)
            </label>
            <input
                type="text"
                placeholder="e.g. 6 months, 1 year, Ramadan 2026"
                value={inputs.targetTime}
                onChange={(e) => setInputs({ ...inputs, targetTime: e.target.value })}
                className="w-full min-h-[48px] p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
            </div>

            {/* Starting Point - Full Width */}
            <div className="col-span-1 md:col-span-2 space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                Starting Point
            </label>
            <input
                type="text"
                placeholder="e.g. Surah Al-Baqarah, Juz 30, Verse 15 of Surah Yasin"
                value={inputs.startingPoint}
                onChange={(e) => setInputs({ ...inputs, startingPoint: e.target.value })}
                className="w-full min-h-[48px] p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
            </div>
        </div>

        <button
            onClick={generatePrompt}
            className="w-full min-h-[52px] py-4 bg-primary hover:bg-primary-light text-white font-bold rounded-xl shadow-md active:scale-[0.99] transition-transform flex items-center justify-center gap-2"
        >
            <Brain className="w-5 h-5" />
            Generate Personalised Plan
        </button>
        </div>

        {generatedPrompt && (
        <div className="bg-slate-50 border-t border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                Generated Prompt
            </h3>
            <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100"
            >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Prompt'}
            </button>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-600 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
            {generatedPrompt}
            </div>
        </div>
        )}
    </div>
  );
}
