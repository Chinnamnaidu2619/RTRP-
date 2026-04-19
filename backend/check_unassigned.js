const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const db = new sqlite3.Database('./database/timetable.db');

let output = '';

db.serialize(() => {
  db.all(`
    SELECT subject_code, subject_name, year, subject_type, hours_per_week
    FROM Subjects
    WHERE faculty_id IS NULL
  `, [], (err, rows) => {
    if (err) { console.error(err); return; }
    output += '\n=== SUBJECTS WITH NO FACULTY ASSIGNED ===\n';
    output += 'Total: ' + rows.length + '\n';
    rows.forEach(r => {
      output += `Subject Code: ${r.subject_code} | Name: ${r.subject_name} | Year: ${r.year} | Type: ${r.subject_type} | Hours/Week: ${r.hours_per_week}\n`;
    });

    db.all(`
      SELECT f.faculty_id, f.faculty_name, f.department, f.email
      FROM Faculty f
      LEFT JOIN Subjects s ON f.faculty_id = s.faculty_id
      WHERE s.faculty_id IS NULL
    `, [], (err2, rows2) => {
      if (err2) { console.error(err2); return; }
      output += '\n=== FACULTY NOT ASSIGNED TO ANY SUBJECT ===\n';
      output += 'Total: ' + rows2.length + '\n';
      rows2.forEach(r => {
        output += `ID: ${r.faculty_id} | Name: ${r.faculty_name} | Dept: ${r.department} | Email: ${r.email}\n`;
      });

      fs.writeFileSync('unassigned_report.txt', output);
      console.log(output);
      db.close();
    });
  });
});
