const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const uploadDir = './uploads';
const files = fs.readdirSync(uploadDir);

files.forEach(file => {
    const filePath = path.join(uploadDir, file);
    if (fs.statSync(filePath).isFile()) {
        try {
            const workbook = xlsx.readFile(filePath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = xlsx.utils.sheet_to_json(sheet);
            const match = data.find(row => {
                const keys = Object.keys(row).map(k => k.toLowerCase().trim());
                if (keys.includes('subject_code')) {
                    const rowCode = row[Object.keys(row).find(k => k.toLowerCase().trim() === 'subject_code')];
                    return rowCode === 'A6CS27';
                }
                return false;
            });
            if (match) {
                console.log(`--- Match found in ${file} ---`);
                console.log(JSON.stringify(match, null, 2));
            }
        } catch (e) {
            // Not an excel file or other error
        }
    }
});
