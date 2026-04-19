-- Database schema for the Automatic Timetable Management System

CREATE TABLE IF NOT EXISTS Faculty (
    faculty_id INTEGER PRIMARY KEY AUTOINCREMENT,
    faculty_name TEXT NOT NULL,
    department TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Admins (
    admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Subjects (
    subject_code TEXT NOT NULL,
    year INTEGER NOT NULL,
    subject_name TEXT NOT NULL,
    subject_type TEXT CHECK(subject_type IN ('Theory', 'Lab', 'Project', 'Skill')) NOT NULL,
    hours_per_week INTEGER NOT NULL,
    faculty_id INTEGER,
    PRIMARY KEY (subject_code, year),
    FOREIGN KEY (faculty_id) REFERENCES Faculty(faculty_id)
);

CREATE TABLE IF NOT EXISTS Sections (
    section_id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_name TEXT NOT NULL,
    year INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS Rooms (
    room_id TEXT PRIMARY KEY,
    room_type TEXT CHECK(room_type IN ('Classroom', 'Lab')) NOT NULL,
    capacity INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS TimeSlots (
    day TEXT NOT NULL,
    period INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    PRIMARY KEY (day, period)
);

CREATE TABLE IF NOT EXISTS Timetable (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id INTEGER NOT NULL,
    subject_code TEXT NOT NULL,
    faculty_id INTEGER NOT NULL,
    room_id TEXT NOT NULL,
    day TEXT NOT NULL,
    period INTEGER NOT NULL,
    FOREIGN KEY (section_id) REFERENCES Sections(section_id),
    FOREIGN KEY (subject_code) REFERENCES Subjects(subject_code),
    FOREIGN KEY (faculty_id) REFERENCES Faculty(faculty_id),
    FOREIGN KEY (room_id) REFERENCES Rooms(room_id),
    FOREIGN KEY (day, period) REFERENCES TimeSlots(day, period)
);

CREATE TABLE IF NOT EXISTS SubjectFaculty (
    subject_code TEXT NOT NULL,
    year INTEGER NOT NULL,
    faculty_id INTEGER NOT NULL,
    PRIMARY KEY (subject_code, year, faculty_id),
    FOREIGN KEY (subject_code, year) REFERENCES Subjects(subject_code, year),
    FOREIGN KEY (faculty_id) REFERENCES Faculty(faculty_id)
);

CREATE TABLE IF NOT EXISTS Absences (
    absence_id INTEGER PRIMARY KEY AUTOINCREMENT,
    faculty_id INTEGER NOT NULL,
    absence_date TEXT NOT NULL,
    UNIQUE(faculty_id, absence_date),
    FOREIGN KEY (faculty_id) REFERENCES Faculty(faculty_id)
);

CREATE TABLE IF NOT EXISTS SubstituteAssignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timetable_id INTEGER NOT NULL,
    absence_date TEXT NOT NULL,
    substitute_faculty_id INTEGER NOT NULL,
    UNIQUE(timetable_id, absence_date),
    FOREIGN KEY (timetable_id) REFERENCES Timetable(id),
    FOREIGN KEY (substitute_faculty_id) REFERENCES Faculty(faculty_id)
);
