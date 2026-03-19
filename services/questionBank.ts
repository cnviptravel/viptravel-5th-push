
export interface Question {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
}

// Helper to shuffle array and keep track of the correct answer
const shuffleOptions = (correct: string, distractors: string[]) => {
    // Shuffle the options including the correct one
    const allOptions = [correct, ...distractors];
    for (let i = allOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
    }
    const correctIndex = allOptions.indexOf(correct);
    return { options: allOptions, correctAnswer: correctIndex };
};

interface TemplateData {
    verbs: string[]; 
    nouns: string[]; 
    adjectives: string[];
    grammar: { q: string; o: string[]; a: number; }[];
}

export const generateQuestionsForLanguage = (language: string): Question[] => {
    const questions: Question[] = [];
    
    // Data with NO english hints inside the string to prevent easy guessing
    const templates: Record<string, TemplateData> = {
        'English': {
            verbs: ['run', 'eat', 'see', 'do', 'make', 'take', 'come', 'know', 'think', 'get', 'write', 'read', 'speak', 'fly', 'swim', 'drive'],
            nouns: ['apple', 'car', 'house', 'friend', 'time', 'book', 'water', 'money', 'road', 'city', 'phone', 'computer', 'sun', 'moon'],
            adjectives: ['good', 'bad', 'happy', 'sad', 'big', 'small', 'hot', 'cold', 'fast', 'slow', 'new', 'old', 'rich', 'poor'],
            grammar: [
                { q: "Select the correct preposition: 'I am good ___ math.'", o: ['at', 'in', 'on', 'with'], a: 0 },
                { q: "Choose the correct form: 'She ___ to the store yesterday.'", o: ['go', 'gone', 'went', 'goes'], a: 2 },
                { q: "Which sentence is correct?", o: ['He don\'t know.', 'He doesn\'t know.', 'He not know.', 'He no know.'], a: 1 },
                { q: "What is the plural of 'child'?", o: ['childs', 'children', 'childes', 'childrens'], a: 1 },
                { q: "Select the synonym for 'Happy'", o: ['Sad', 'Joyful', 'Angry', 'Tired'], a: 1 },
            ]
        },
        'Mongolian': {
            verbs: ['явах', 'идэх', 'үзэх', 'хийх', 'авах', 'ирэх', 'мэдэх', 'бодох', 'ойлгох', 'унших', 'бичих', 'сурах', 'унтах', 'босох'],
            nouns: ['ном', 'ус', 'гэр', 'сургууль', 'ээж', 'аав', 'хоол', 'мөнгө', 'ажил', 'цаг', 'утас', 'компьютер'],
            adjectives: ['сайн', 'муу', 'том', 'жижиг', 'хурдан', 'удаан', 'шинэ', 'хуучин', 'өндөр', 'намхан', 'хүйтэн', 'халуун'],
            grammar: [
                { q: "'Би сургууль ... явсан' - зөв нөхцөлийг сонго.", o: ['руу', 'д', 'аас', 'тай'], a: 0 },
                { q: "'Аав' гэдэг үгэнд ямар тийн ялгал тохирох вэ?", o: ['ын', 'ийн', 'ы', 'ний'], a: 0 },
                { q: "Эгшиг зохицох ёсоор 'Өвөө' гэдэг үгэнд аль залгавар залгах вэ?", o: ['тэй', 'тай', 'той', 'тий'], a: 2 },
                { q: "'Морь' гэдэг үгийн олон тоог сонго.", o: ['морьд', 'морьнууд', 'мориуд', 'морьс'], a: 0 },
                { q: "Хүндэтгэлийн хэлбэрийг ол: 'Идэх'", o: ['Зооглох', 'Уух', 'Залгих', 'Үмхэх'], a: 0 },
            ]
        },
        'Chinese': {
            verbs: ['吃', '喝', '去', '来', '看', '做', '买', '说', '听', '写'],
            nouns: ['书', '水', '饭', '车', '人', '家', '钱', '朋友'],
            adjectives: ['好', '大', '小', '多', '少', '热', '冷', '高兴'],
            grammar: [
                { q: "How do you say 'Hello'?", o: ['Ni Hao', 'Xie Xie', 'Zai Jian', 'Duibuqi'], a: 0 },
                { q: "Which particle indicates a completed action?", o: ['ba (吧)', 'le (了)', 'ma (吗)', 'ne (呢)'], a: 1 },
                { q: "Select the correct measure word for 'Book': Yi ___ shu.", o: ['ge (个)', 'ben (本)', 'zhi (只)', 'tiao (条)'], a: 1 },
                { q: "Translate: 'I am American.'", o: ['Wo shi Meiguo ren.', 'Wo Meiguo ren.', 'Wo zai Meiguo.', 'Wo qu Meiguo.'], a: 0 },
                { q: "What is the pinyin for 'Water'?", o: ['Huo', 'Shui', 'Tu', 'Mu'], a: 1 },
            ]
        },
        'Russian': {
            verbs: ['читать', 'говорить', 'видеть', 'знать', 'идти', 'любить', 'делать', 'думать'],
            nouns: ['дом', 'стол', 'книга', 'вода', 'друг', 'деньги', 'машина'],
            adjectives: ['хороший', 'большой', 'новый', 'красивый', 'плохой', 'маленький'],
            grammar: [
                 { q: "Select the correct gender for 'Стол' (Table).", o: ['Masculine', 'Feminine', 'Neuter', 'Plural'], a: 0 },
                 { q: "How to say 'Thank you'?", o: ['Privet', 'Spasibo', 'Poka', 'Da'], a: 1 },
                 { q: "Choose the correct preposition: 'Я иду ___ школу' (I go to school).", o: ['в', 'на', 'с', 'к'], a: 0 },
                 { q: "What is the plural of 'Дом' (House)?", o: ['Домы', 'Дома', 'Домов', 'Доме'], a: 1 },
                 { q: "Conjugate 'Быть' (To be) for 'Я' (I) in present tense.", o: ['Есть', '(Omitted/None)', 'Был', 'Буду'], a: 1 },
            ]
        },
        'Japanese': {
            verbs: ['食べる', '行く', '見る', 'する', '来る', '飲む', '話す', '書く'],
            nouns: ['本', '車', '水', '猫', '人', '家', '友'],
            adjectives: ['大きい', '小さい', '高い', '新しい', '古い', '暑い'],
            grammar: [
                { q: "Which particle marks the topic of a sentence?", o: ['wa (は)', 'ga (が)', 'wo (を)', 'ni (に)'], a: 0 },
                { q: "How do you say 'Thank you'?", o: ['Konnichiwa', 'Arigatou', 'Sayonara', 'Hai'], a: 1 },
                { q: "What is 'Water' in Japanese?", o: ['Mizu', 'Biiru', 'Ocha', 'Gohan'], a: 0 },
                { q: "Select the correct verb for 'To Eat'.", o: ['Taberu', 'Nomu', 'Miru', 'Iku'], a: 0 },
                { q: "What comes after a direct object?", o: ['wo (を)', 'wa (は)', 'no (の)', 'de (で)'], a: 0 }
            ]
        },
        'Korean': {
            verbs: ['가다', '먹다', '보다', '하다', '자다', '오다', '마시다'],
            nouns: ['책', '물', '집', '친구', '학교', '돈'],
            adjectives: ['좋다', '크다', '작다', '예쁘다', '나쁘다'],
            grammar: [
                 { q: "Which suffix is the formal polite ending?", o: ['-mnida (-입니다)', '-yo (-요)', '-ya (-야)', '-da (-다)'], a: 0 },
                 { q: "Which is the Subject Particle?", o: ['i/ga (이/가)', 'eul/leul (을/를)', 'eun/neun (은/는)', 'e/eseo (에/에서)'], a: 0 },
                 { q: "Translate 'Hello'.", o: ['Annyeonghaseyo', 'Gamsahamnida', 'Mianhamnida', 'Juseyo'], a: 0 },
                 { q: "Select the word for 'School'.", o: ['Hakgyo', 'Jip', 'Byungwon', 'Sikdang'], a: 0 },
                 { q: "Past tense marker?", o: ['-at/eot (-았/었)', '-go (-고)', '-lge (-ㄹ게)', '-myun (-면)'], a: 0 }
            ]
        },
        'German': {
            verbs: ['gehen', 'haben', 'sein', 'machen', 'sehen', 'essen', 'trinken', 'schlafen', 'laufen'],
            nouns: ['Haus', 'Auto', 'Buch', 'Wasser', 'Freund', 'Tisch', 'Geld', 'Zeit'],
            adjectives: ['gut', 'groß', 'klein', 'schön', 'neu', 'alt', 'kalt', 'warm'],
            grammar: [
                 { q: "Select the correct article for 'Mädchen'.", o: ['Der', 'Die', 'Das', 'Den'], a: 2 },
                 { q: "What is the plural of 'Kind'?", o: ['Kinder', 'Kinde', 'Kinds', 'Kindern'], a: 0 },
                 { q: "Conjugate 'Sein' (To be) for 'Ich' (I).", o: ['Bin', 'Bist', 'Ist', 'Sind'], a: 0 },
                 { q: "Translate 'Good Morning'.", o: ['Guten Morgen', 'Gute Nacht', 'Hallo', 'Auf Wiedersehen'], a: 0 },
                 { q: "Which preposition usually takes the Dative case?", o: ['Mit', 'Durch', 'Für', 'Ohne'], a: 0 }
            ]
        },
        'French': {
            verbs: ['être', 'avoir', 'aller', 'faire', 'voir', 'manger', 'parler', 'boire', 'dormir'],
            nouns: ['maison', 'livre', 'eau', 'voiture', 'ami', 'temps', 'argent', 'chat'],
            adjectives: ['grand', 'petit', 'bon', 'beau', 'nouveau', 'heureux', 'triste', 'chaud'],
            grammar: [
                 { q: "Conjugate 'Être' for 'Je'.", o: ['suis', 'es', 'est', 'sommes'], a: 0 },
                 { q: "What is the gender of 'Maison'?", o: ['Masculine', 'Feminine', 'Neutral', 'Plural'], a: 1 },
                 { q: "Translate 'Thank you'.", o: ['Merci', 'Bonjour', 'S\'il vous plaît', 'Oui'], a: 0 },
                 { q: "Select the correct article: '___ pomme' (The apple).", o: ['La', 'Le', 'L\'', 'Les'], a: 0 },
                 { q: "How do you say 'My name is...'?", o: ['Je m\'appelle...', 'J\'ai...', 'Je suis...', 'Je vais...'], a: 0 }
            ]
        },
        'Spanish': {
            verbs: ['ser', 'estar', 'ir', 'hacer', 'comer', 'ver', 'hablar', 'beber', 'vivir'],
            nouns: ['casa', 'libro', 'agua', 'coche', 'amigo', 'tiempo', 'dinero', 'gato'],
            adjectives: ['bueno', 'malo', 'grande', 'pequeño', 'feliz', 'nuevo', 'viejo', 'caliente'],
            grammar: [
                 { q: "Which verb is used for permanent states (To be)?", o: ['Ser', 'Estar', 'Tener', 'Haber'], a: 0 },
                 { q: "What is the plural of 'Luz'?", o: ['Luces', 'Luzes', 'Luzs', 'Luci'], a: 0 },
                 { q: "Translate 'Water'.", o: ['Agua', 'Fuego', 'Tierra', 'Aire'], a: 0 },
                 { q: "Conjugate 'Hablamos'.", o: ['We speak', 'I speak', 'They speak', 'You speak'], a: 0 },
                 { q: "Gender of 'Problema'?", o: ['Masculine', 'Feminine', 'Neutral', 'Both'], a: 0 }
            ]
        },
        'Italian': {
            verbs: ['essere', 'avere', 'andare', 'fare', 'mangiare', 'vedere', 'parlare', 'bere', 'dormire'],
            nouns: ['casa', 'libro', 'acqua', 'macchina', 'amico', 'tempo', 'soldi', 'gatto'],
            adjectives: ['buono', 'grande', 'piccolo', 'bello', 'nuovo', 'felice', 'triste', 'caldo'],
            grammar: [
                 { q: "Select the correct article for 'Amico'.", o: ['Il', 'Lo', 'L\'', 'La'], a: 2 },
                 { q: "What is the plural of 'Pizza'?", o: ['Pizze', 'Pizzi', 'Pizzas', 'Pizzai'], a: 0 },
                 { q: "Translate 'Where is...?'.", o: ['Dov\'è...?', 'Chi è...?', 'Come è...?', 'Quando è...?'], a: 0 },
                 { q: "Conjugate 'Avere' (To have) for 'Io' (I).", o: ['Ho', 'Hai', 'Ha', 'Abbiamo'], a: 0 },
                 { q: "How do you say 'Good Night'?", o: ['Buonanotte', 'Buongiorno', 'Buonasera', 'Ciao'], a: 0 }
            ]
        }
    };

    const langData = templates[language] || templates['English'];
    
    // Ensure we have fallback data if specific language lists are missing
    const verbs = langData.verbs || templates['English'].verbs;
    const nouns = langData.nouns || templates['English'].nouns!;
    const adjectives = langData.adjectives || templates['English'].adjectives!;

    // 1. Add All 5 Handcrafted Grammar Questions (Guaranteed unique and correct)
    if (langData.grammar) {
        langData.grammar.forEach((g: any, i: number) => {
            questions.push({
                id: `static_${i}`,
                question: g.q,
                options: g.o,
                correctAnswer: g.a
            });
        });
    }

    // 2. Generate exactly 5 Vocabulary Questions to reach total of 10
    // We will alternate types: 2 Verbs, 2 Nouns, 1 Adjective
    
    // Verb Q1
    const v1 = verbs[0];
    const d1 = [nouns[0], adjectives[0], nouns[1]];
    const r1 = shuffleOptions(v1, d1);
    questions.push({
        id: 'gen_v1',
        question: language === 'Mongolian' ? 'Дараах үгсээс Үйл үгийг (Verb) олно уу?' : 'Which of the following is a Verb (Action)?',
        options: r1.options,
        correctAnswer: r1.correctAnswer
    });

    // Verb Q2
    const v2 = verbs[1];
    const d2 = [nouns[1], adjectives[1], nouns[2]];
    const r2 = shuffleOptions(v2, d2);
    questions.push({
        id: 'gen_v2',
        question: language === 'Mongolian' ? 'Аль нь үйл хөдлөл заасан үг вэ?' : 'Identify the action word (Verb):',
        options: r2.options,
        correctAnswer: r2.correctAnswer
    });

    // Noun Q1
    const n1 = nouns[2];
    const d3 = [verbs[2], adjectives[2], verbs[3]];
    const r3 = shuffleOptions(n1, d3);
    questions.push({
        id: 'gen_n1',
        question: language === 'Mongolian' ? 'Дараах үгсээс Нэр үгийг (Noun) олно уу?' : 'Which of the following is a Noun (Object)?',
        options: r3.options,
        correctAnswer: r3.correctAnswer
    });

    // Noun Q2
    const n2 = nouns[3];
    const d4 = [verbs[4], adjectives[3], verbs[5]];
    const r4 = shuffleOptions(n2, d4);
    questions.push({
        id: 'gen_n2',
        question: language === 'Mongolian' ? 'Аль нь эд зүйл эсвэл хүнийг заасан үг вэ?' : 'Identify the object word (Noun):',
        options: r4.options,
        correctAnswer: r4.correctAnswer
    });

    // Adjective Q1
    const a1 = adjectives[4];
    const d5 = [verbs[6], nouns[4], verbs[7]];
    const r5 = shuffleOptions(a1, d5);
    questions.push({
        id: 'gen_a1',
        question: language === 'Mongolian' ? 'Дараах үгсээс Тэмдэг нэрийг (Adjective) олно уу?' : 'Which word describes a quality (Adjective)?',
        options: r5.options,
        correctAnswer: r5.correctAnswer
    });

    // Return all 10 questions
    return questions;
};
