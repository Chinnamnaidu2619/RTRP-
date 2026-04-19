# Requirements Document

## Introduction

This feature extends the Automatic Timetable Management System's scheduling generator to enforce faculty workload bounds, balance free-class counts across sections of the same year, and restrict free-class assignment to situations where a faculty member is genuinely unavailable. The goal is to produce fair, constraint-compliant timetables without manual post-generation fixes.

## Glossary

- **Scheduler**: The timetable generation engine (`generator.js`) responsible for assigning subjects, faculty, rooms, and time slots.
- **Faculty**: A teaching staff member identified by `faculty_id` in the Faculty table.
- **Workload**: The total number of scheduled teaching periods assigned to a Faculty member across all sections in a single week.
- **Free Class**: A scheduled period in a section's timetable that is filled with a non-teaching activity (Library, Sports, or Counselling) because no Faculty member is available for that slot.
- **Section**: A student group identified by `section_id` and belonging to a specific `year` (2nd or 3rd).
- **Year Group**: The set of all Sections sharing the same `year` value (e.g., all 2nd-year sections).
- **Free-Class Count**: The total number of Free Classes assigned to a Section in one week.
- **Availability Conflict**: A state where every Faculty member mapped to a subject for a given Section is already busy in a candidate time slot.
- **Period**: A single one-hour time slot within a day, numbered 1–6.
- **Week**: A full scheduling cycle spanning Monday through Saturday (6 days × 6 periods = 36 slots per section).

---

## Requirements

### Requirement 1: Faculty Workload Minimum

**User Story:** As a timetable administrator, I want each faculty member to be assigned at least 15 teaching periods per week, so that no faculty member is underutilised.

#### Acceptance Criteria

1. THE Scheduler SHALL compute the total number of scheduled teaching periods for each Faculty member after generating a complete timetable.
2. WHEN the total teaching periods for a Faculty member falls below 15, THE Scheduler SHALL flag that Faculty member as under-workload and reject the generated timetable attempt.
3. IF a valid timetable cannot be produced within the configured retry limit where all Faculty members meet the 15-period minimum, THEN THE Scheduler SHALL return an error message identifying the Faculty members whose workload fell below 15 periods.

---

### Requirement 2: Faculty Workload Maximum

**User Story:** As a timetable administrator, I want each faculty member to be assigned no more than 18 teaching periods per week, so that no faculty member is overloaded.

#### Acceptance Criteria

1. WHILE assigning a teaching period to a Faculty member, THE Scheduler SHALL check whether that Faculty member's current weekly period count has reached 18.
2. WHEN a Faculty member's weekly period count has reached 18, THE Scheduler SHALL not assign any additional teaching periods to that Faculty member for the remainder of the week.
3. IF no Faculty member with fewer than 18 assigned periods is available for a required subject slot, THEN THE Scheduler SHALL treat that slot as an Availability Conflict and apply the Free Class assignment rule (see Requirement 4).

---

### Requirement 3: Free-Class Count Balancing Across Sections — 2nd Year

**User Story:** As a timetable administrator, I want all 2nd-year sections to have the same number of free classes per week, so that no 2nd-year student group receives fewer non-teaching periods than another.

#### Acceptance Criteria

1. THE Scheduler SHALL compute the Free-Class Count for every 2nd-year Section after generating a complete timetable.
2. WHEN the Free-Class Counts across all 2nd-year Sections are not equal, THE Scheduler SHALL reject the generated timetable attempt and retry.
3. THE Scheduler SHALL ensure the common Free-Class Count for all 2nd-year Sections does not exceed 3 per week (see Requirement 5).

---

### Requirement 4: Free-Class Count Balancing Across Sections — 3rd Year

**User Story:** As a timetable administrator, I want all 3rd-year sections to have the same number of free classes per week, so that no 3rd-year student group receives fewer non-teaching periods than another.

#### Acceptance Criteria

1. THE Scheduler SHALL compute the Free-Class Count for every 3rd-year Section after generating a complete timetable.
2. WHEN the Free-Class Counts across all 3rd-year Sections are not equal, THE Scheduler SHALL reject the generated timetable attempt and retry.
3. THE Scheduler SHALL ensure the common Free-Class Count for all 3rd-year Sections does not exceed 3 per week (see Requirement 5).

---

### Requirement 5: Free-Class Weekly Fixed Target Per Section

**User Story:** As a timetable administrator, I want each section to have exactly 3 free classes per week, so that students receive a consistent and predictable number of non-teaching periods.

#### Acceptance Criteria

1. WHILE assigning Free Classes to a Section, THE Scheduler SHALL track the Section's Free-Class Count for the current week.
2. WHEN a Section's Free-Class Count has reached 3, THE Scheduler SHALL not assign any additional Free Classes to that Section for the remainder of the week.
3. WHEN timetable generation is complete, THE Scheduler SHALL verify that every Section has a Free-Class Count of exactly 3.
4. IF a Section's Free-Class Count is not exactly 3 after a generation attempt, THEN THE Scheduler SHALL reject the timetable attempt and retry.

---

### Requirement 6: Free Classes Assigned Only on Availability Conflict

**User Story:** As a timetable administrator, I want free classes to be assigned only when a faculty member is genuinely unavailable, so that free periods are not used as padding to fill the timetable.

#### Acceptance Criteria

1. THE Scheduler SHALL attempt to assign a teaching Faculty member to every open period in a Section's timetable before considering a Free Class for that period.
2. WHEN at least one Faculty member mapped to a subject for a Section is available in a candidate time slot, THE Scheduler SHALL assign that Faculty member and SHALL NOT assign a Free Class to that slot.
3. WHEN every Faculty member mapped to subjects for a Section is busy or has reached the 18-period workload maximum in a candidate time slot, THE Scheduler SHALL classify that slot as an Availability Conflict.
4. WHEN an Availability Conflict is detected for a slot and the Section's Free-Class Count is below 3, THE Scheduler SHALL assign a Free Class to that slot.
5. IF an Availability Conflict is detected for a slot and the Section's Free-Class Count has already reached 3, THEN THE Scheduler SHALL attempt to reschedule other subjects to resolve the conflict before rejecting the timetable attempt.

---

### Requirement 7: Workload and Free-Class Validation Report

**User Story:** As a timetable administrator, I want a summary report after generation that shows each faculty member's workload and each section's free-class count, so that I can verify the timetable meets all constraints without manually inspecting every entry.

#### Acceptance Criteria

1. WHEN a timetable is successfully generated, THE Scheduler SHALL produce a validation report containing the weekly period count for each Faculty member.
2. WHEN a timetable is successfully generated, THE Scheduler SHALL include in the validation report the Free-Class Count for each Section grouped by year.
3. THE Scheduler SHALL mark each Faculty member in the report as compliant if the weekly period count is between 15 and 18 inclusive, and non-compliant otherwise.
4. THE Scheduler SHALL mark each Year Group in the report as balanced if all Sections within that Year Group share the same Free-Class Count, and unbalanced otherwise.

---

### Requirement 8: Auto-Allocation and Timetable Generation on Faculty Threshold

**User Story:** As a timetable administrator, when 5 faculty members have been added/allocated to subjects, the system should automatically trigger faculty allocation and timetable generation so I don't have to manually initiate it.

#### Acceptance Criteria

1. WHEN the number of faculty members allocated to subjects reaches 5, THE System SHALL automatically trigger the timetable generation process.
2. THE System SHALL assign all 5 faculty members to their respective subjects before initiating timetable generation.
3. IF timetable generation fails after the auto-trigger, THEN THE System SHALL return a descriptive error message without retrying automatically.
