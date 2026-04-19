const db = require('./db');
const fs = require('fs');
const path = require('path');

const mapping = JSON.parse(fs.readFileSync(path.join(__dirname, 'faculty_mapping.json'), 'utf8'));

db.all(`SELECT section_id FROM Sections`, [], (err, sections) => {
    const validSectionIds = new Set(sections.map(s => s.section_id));
    console.log('Valid section IDs:', [...validSectionIds].sort((a,b)=>a-b).join(', '));

    const mappingIds = Object.keys(mapping).map(Number);
    const staleIds = mappingIds.filter(id => !validSectionIds.has(id));
    console.log('Stale section IDs in mapping:', staleIds);

    for (const id of staleIds) {
        delete mapping[id];
    }

    fs.writeFileSync(path.join(__dirname, 'faculty_mapping.json'), JSON.stringify(mapping, null, 2));
    console.log(`Removed ${staleIds.length} stale section(s) from faculty_mapping.json`);
    console.log('Remaining sections in mapping:', Object.keys(mapping).length);
    db.close();
});
