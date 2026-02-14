
import { findBestMatch } from '../src/utils/voiceSearchLogic';

// Mock Data
const MOCK_AYAHS = [
    { verse_key: '2:1', text_imlaei_simple: 'الم', text_uthmani: 'الم' },
    { verse_key: '2:2', text_imlaei_simple: 'ذالك الكتاب لا ريب فيه', text_uthmani: 'ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ ۛ فِيهِ' },
    { verse_key: '36:1', text_imlaei_simple: 'يس', text_uthmani: 'يس' },
];

const TEST_CASES = [
    // Surah Matching
    { input: 'Surah Yasin', expectedType: 'surah', expectedId: 36, desc: 'Surah Yasin (English)' },
    { input: 'Yaseen', expectedType: 'surah', expectedId: 36, desc: 'Yaseen (Alias)' },
    { input: 'سورة يس', expectedType: 'surah', expectedId: 36, desc: 'Surah Yasin (Arabic)' },
    { input: 'Qaaf', expectedType: 'surah', expectedId: 50, desc: 'Surah Qaf (Alias)' },
    { input: 'Al-Baqarah', expectedType: 'surah', expectedId: 2, desc: 'Al-Baqarah (Exact)' },
    
    // Local Ayah Matching
    { input: 'الم', ayahs: MOCK_AYAHS, expectedType: 'ayah', expectedKey: '2:1', desc: 'Alif Lam Mim (Exact)' },
    { input: 'ذالك الكتاب', ayahs: MOCK_AYAHS, expectedType: 'ayah', expectedKey: '2:2', desc: 'Zalikal Kitab (Partial)' },
    
    // Global Fallback
    { input: 'Random text not in local', ayahs: MOCK_AYAHS, expectedType: 'global', desc: 'Global Fallback' },
];

console.log('Running Voice Search Logic Tests...\n');

let passed = 0;
let failed = 0;

TEST_CASES.forEach((test, index) => {
    try {
        const result = findBestMatch(test.input, test.ayahs || []);
        
        let isPass = false;
        if (test.expectedType === 'surah') {
            isPass = result?.type === 'surah' && (result?.result as any)?.id === test.expectedId;
        } else if (test.expectedType === 'ayah') {
            isPass = result?.type === 'ayah' && result?.target === test.expectedKey;
        } else if (test.expectedType === 'global') {
            isPass = result?.type === 'global';
        }

        if (isPass) {
            console.log(`✅ Test ${index + 1}: ${test.desc} - PASSED`);
            passed++;
        } else {
            console.error(`❌ Test ${index + 1}: ${test.desc} - FAILED`);
            console.error('   Input:', test.input);
            console.error('   Expected:', test.expectedType, test.expectedId || test.expectedKey);
            console.error('   Got:', result);
            failed++;
        }
    } catch (e) {
        console.error(`❌ Test ${index + 1}: ${test.desc} - ERROR`, e);
        failed++;
    }
});

console.log(`\nSummary: ${passed} Passed, ${failed} Failed`);

if (failed > 0) process.exit(1);
