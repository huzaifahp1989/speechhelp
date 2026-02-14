import VoiceSearchStandalone from '@/components/VoiceSearchStandalone';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Voice Search - Quran Assistant',
    description: 'Search the Quran by reciting or speaking commands.',
};

export default function VoiceSearchPage() {
    return (
        <main className="min-h-screen bg-slate-50 pt-8 pb-20">
            <div className="container mx-auto px-4">
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">
                        Voice Search
                    </h1>
                    <p className="text-slate-500">
                        Recite any Ayah or speak a command to navigate.
                    </p>
                </div>
                
                <VoiceSearchStandalone />
            </div>
        </main>
    );
}
