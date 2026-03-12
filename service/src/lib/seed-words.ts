import { WordModel } from '../models/word';

const INITIAL_WORDS = {
    english: {
        easy: [
            'Cat', 'Dog', 'House', 'Apple', 'Book', 'Chair', 'Table', 'Phone',
            'Water', 'Bread', 'Milk', 'Tree', 'Flower', 'Car', 'Bike', 'Ball',
            'Fish', 'Bird', 'Door', 'Window', 'Pen', 'Paper', 'Shoe', 'Shirt',
            'Hat', 'Cup', 'Plate', 'Spoon', 'Fork', 'Knife', 'Bed', 'Lamp',
            'Clock', 'Mirror', 'Towel', 'Soap', 'Brush', 'Comb', 'Key', 'Lock'
        ],
        medium: [
            'Telescope', 'Freedom', 'Jazz', 'Guitar', 'Mountain', 'Ocean',
            'Desert', 'Forest', 'Castle', 'Pirate', 'Astronaut', 'Robot',
            'Volcano', 'Earthquake', 'Hurricane', 'Lightning', 'Thunder',
            'Rainbow', 'Sunset', 'Sunrise', 'Midnight', 'Noon', 'Dawn',
            'Dusk', 'Spring', 'Summer', 'Autumn', 'Winter', 'Holiday',
            'Festival', 'Museum', 'Theater', 'Library', 'Hospital', 'School'
        ],
        hard: [
            'Quantum', 'Renaissance', 'Algorithm', 'Philosophy', 'Metaphor',
            'Paradox', 'Hypothesis', 'Catalyst', 'Metabolism', 'Photosynthesis',
            'Gravity', 'Relativity', 'Electricity', 'Magnetism', 'Radiation',
            'Evolution', 'Mutation', 'Chromosome', 'Virus', 'Bacteria',
            'Microorganism', 'Ecosystem', 'Biodiversity', 'Climate', 'Geology'
        ]
    },
    thai: {
        easy: [
            'แมว', 'หมา', 'บ้าน', 'แอปเปิ้ล', 'หนังสือ', 'เก้าอี้', 'โต๊ะ', 'โทรศัพท์',
            'น้ำ', 'ขนมปัง', 'นม', 'ต้นไม้', 'ดอกไม้', 'รถ', 'จักรยาน', 'บอล',
            'ปลา', 'นก', 'ประตู', 'หน้าต่าง', 'ปากกา', 'กระดาษ', 'รองเท้า', 'เสื้อ',
            'หมวก', 'ถ้วย', 'จาน', 'ช้อน', 'ส้อม', 'มีด', 'เตียง', 'โคมไฟ',
            'นาฬิกา', 'กระจก', 'ผ้าเช็ดตัว', 'สบู่', 'แปรง', 'หวี', 'กุญแจ'
        ],
        medium: [
            'กล้องโทรทรรศน์', 'อิสรภาพ', 'แจ๊ส', 'กีตาร์', 'ภูเขา', 'มหาสมุทร',
            'ทะเลทราย', 'ป่าไม้', 'ปราสาท', 'โจรสลัด', 'นักบินอวกาศ', 'หุ่นยนต์',
            'ภูเขาไฟ', 'แผ่นดินไหว', 'พายุ', 'ฟ้าแลบ', 'ฟ้าร้อง',
            'รุ้ง', 'พระอาทิตย์ตก', 'พระอาทิตย์ขึ้น', 'เที่ยงคืน', 'เที่ยงวัน', 'รุ่งเช้า',
            'พลบค่ำ', 'ฤดูใบไม้ผลิ', 'ฤดูร้อน', 'ฤดูใบไม้ร่วง', 'ฤดูหนาว', 'วันหยุด',
            'เทศกาล', 'พิพิธภัณฑ์', 'โรงละคร', 'ห้องสมุด', 'โรงพยาบาล', 'โรงเรียน'
        ],
        hard: [
            'ควอนตัม', 'เรอเนสซองส์', 'อัลกอริทึม', 'ปรัชญา', 'อุปมา',
            'ปฏิทรรศน์', 'สมมติฐาน', 'ตัวเร่งปฏิกิริยา', 'เมแทบอลิซึม', 'การสังเคราะห์แสง',
            'แรงโน้มถ่วง', 'สัมพัทธภาพ', 'ไฟฟ้า', 'แม่เหล็ก', 'รังสี',
            'วิวัฒนาการ', 'การกลายพันธุ์', 'โครโมโซม', 'ไวรัส', 'แบคทีเรีย',
            'จุลินทรีย์', 'ระบบนิเวศ', 'ความหลากหลายทางชีวภาพ', 'ภูมิอากาศ', 'ธรณีวิทยา'
        ]
    }
};

export async function seedWordBank() {
    console.log('Seeding word bank...');
    
    let totalAdded = 0;
    let englishCount = 0;
    let thaiCount = 0;
    
    // Seed English words
    for (const [difficulty, words] of Object.entries(INITIAL_WORDS.english)) {
        for (const word of words) {
            const exists = await WordModel.findOne({ 
                word: { $regex: new RegExp(`^${word}$`, 'i') },
                language: 'english'
            });
            
            if (!exists) {
                await WordModel.create({
                    word,
                    difficulty: difficulty as any,
                    language: 'english',
                    wordType: 'noun',
                    createdAt: new Date()
                });
                totalAdded++;
                englishCount++;
            }
        }
    }
    
    // Seed Thai words
    for (const [difficulty, words] of Object.entries(INITIAL_WORDS.thai)) {
        for (const word of words) {
            const exists = await WordModel.findOne({ 
                word: word, // Thai script exact match
                language: 'thai'
            });
            
            if (!exists) {
                await WordModel.create({
                    word,
                    difficulty: difficulty as any,
                    language: 'thai',
                    wordType: 'noun',
                    createdAt: new Date()
                });
                totalAdded++;
                thaiCount++;
            }
        }
    }
    
    console.log(`✓ Added ${totalAdded} new words to word bank`);
    console.log(`  - English: ${englishCount} words`);
    console.log(`  - Thai: ${thaiCount} words`);
    console.log(`  - Total English: ${INITIAL_WORDS.english.easy.length + INITIAL_WORDS.english.medium.length + INITIAL_WORDS.english.hard.length} words`);
    console.log(`  - Total Thai: ${INITIAL_WORDS.thai.easy.length + INITIAL_WORDS.thai.medium.length + INITIAL_WORDS.thai.hard.length} words`);
}
