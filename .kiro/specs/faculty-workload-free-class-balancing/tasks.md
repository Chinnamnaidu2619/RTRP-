# Implementation Plan: Faculty Workload & Free-Class Balancing

## Overview

Modify `backend/services/generator.js` to enforce faculty workload bounds (15–18 periods/week), restrict free-class assignment to genuine availability conflicts, balance free-class counts across year-group sections, and produce a post-generation validation report.

## Tasks

- [ ] 1. Add in-memory workload tracking helpers
  - Inside `tryScheduleInMemory`, declare `const facultyWorkload = {}` at the top alongside the existing busy-sets
  - Implement `workloadOf(fId)`, `canAssign(fId)` (returns `true` when count < 18), and `recordAssign(fId)` as closures over `facultyWorkload`
  - Call `recordAssign(fId)` inside the existing `mark()` function for every non-free-period entry (guard with `!FREE_PERIOD_SUBJECTS.has(subCode)`)
  - _Requirements: 2.1, 2.2_

  - [ ]* 1.1 Write property test — workload cap enforcement (Property 3)
    - **Property 3: Workload cap enforcement**
    - Generate a `facultyWorkload` state where a faculty's count equals 18; assert `canAssign` returns `false`
    - Generate states where count < 18; assert `canAssign` returns `true`
    - **Validates: Requirements 2.1, 2.2**

- [ ] 2. Add free-class tracking helpers
  - Rename the existing `freeDayCount` variable to `freeCount` throughout `tryScheduleInMemory`
  - Implement `freeOf(sId)`, `canAddFree(sId)` (returns `true` when count < 3), and `recordFree(sId)` as closures over `freeCount`
  - Replace all direct `freeDayCount[sId]` reads/writes with calls to `freeOf` / `recordFree`
  - _Requirements: 5.1, 5.2_

  - [ ]* 2.1 Write property test — free-class exact-target enforcement (Property 5)
    - **Property 5: Free-class exact-target enforcement**
    - Generate a `freeCount` state where a section's count equals 3; assert `canAddFree` returns `false`
    - Generate states where count < 3; assert `canAddFree` returns `true`
    - Generate a scheduling result where any section has `freeCount != 3`; assert `validateConstraints` returns `ok: false`
    - **Validates: Requirements 5.2, 5.3, 5.4, 3.3, 4.3**

- [ ] 3. Implement `isAvailabilityConflict` helper
  - Add `const sectionMappedFaculty = {}` built once before the scheduling loop from `baseAssignments` (collect all `fId` values per `section_id` into a `Set`)
  - Implement `isAvailabilityConflict(sId, d, p)` that returns `true` when every `fId` in `sectionMappedFaculty[sId]` satisfies `facultyBusy.has(fKey(fId, d, p)) || !canAssign(fId)`
  - _Requirements: 6.3_

  - [ ]* 3.1 Write property test — free classes only on genuine conflict (Property 7)
    - **Property 7: Free classes only on genuine conflict**
    - Generate random `(facultyBusy, facultyWorkload, sectionMappedFaculty)` states; for any slot where `isAvailabilityConflict` returns `false`, assert that a free class must not be assigned
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [ ] 4. Enforce workload cap during the scheduling loop
  - In the theory (priority 3) and project (priority 2) assignment branches, replace the `isFree(fId, ...)` check with a combined check: `isFree(fId, ...) && canAssign(fId)`
  - In the lab (priority 1) branch, add `canAssign(fId)` to the guard before placing each block
  - When `canAssign(fId)` is `false` and no other faculty is available, return `{ success: false, error: \`Workload cap reached: faculty ${fId}\` }` so the attempt is retried
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 5. Enforce exactly 3 free classes per section
  - In the free-period (priority 0) branch, replace the current unconditional assignment logic with:
    1. Check `canAddFree(sId)`; if `false` (count already at 3), skip
    2. Check `isAvailabilityConflict(sId, d, 6)`; if `false`, skip (faculty is available — do not assign a free class)
    3. If both checks pass, call `mark(...)` and `recordFree(sId)`
  - If `hoursLeft > 0` after exhausting all days, return `{ success: false, error: \`Free period unschedulable: ...\` }` (existing behaviour preserved)
  - Note: the exact-3 lower-bound is enforced by `validateConstraints` (task 7), not here — this branch only prevents exceeding 3
  - _Requirements: 5.1, 5.2, 6.1, 6.2, 6.3, 6.4_

- [ ] 6. Checkpoint — verify scheduling loop compiles and existing tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement `validateConstraints(entries, sections)`
  - Export or define as a module-level function (not inside `tryScheduleInMemory`)
  - Recompute `workload` per faculty from `entries` (exclude `FREE_PERIOD_SUBJECTS`)
  - Check every faculty is in [15, 18]; collect under-workload faculty IDs into `errors`
  - Recompute `freeClassCount` per section from `entries` (include only `FREE_PERIOD_SUBJECTS`)
  - Check every section has `freeClassCount === 3`; collect sections with count != 3 into `errors` (this enforces the exact-3 requirement — both under and over are rejected)
  - Group sections by `year`; check all sections in each year group share the same count; collect unbalanced year groups into `errors`
  - Return `{ ok: errors.length === 0, errors }`
  - Call `validateConstraints(result.entries, sections)` inside the retry loop after a successful `tryScheduleInMemory`; if `!ok`, treat as a failed attempt (set `lastError` and continue)
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 4.1, 4.2, 5.3, 5.4_

  - [ ]* 7.1 Write property test — workload count accuracy (Property 1)
    - **Property 1: Workload count accuracy**
    - Generate random arrays of timetable entries with random `faculty_id` and `subject_name` values; assert `computeWorkload(entries, fId)` equals the manual filter count of non-free entries for that faculty
    - **Validates: Requirements 1.1, 7.1**

  - [ ]* 7.2 Write property test — workload compliance classification (Property 2)
    - **Property 2: Workload compliance classification**
    - Generate random integers 0–30; assert `isCompliant(n)` returns `true` iff `n >= 15 && n <= 18`
    - **Validates: Requirements 1.2, 2.2, 7.3**

  - [ ]* 7.3 Write property test — free-class count accuracy (Property 4)
    - **Property 4: Free-class count accuracy**
    - Generate random arrays of timetable entries; assert `computeFreeCount(entries, sId)` equals the manual filter count of free-period entries for that section
    - **Validates: Requirements 3.1, 4.1, 7.2**

  - [ ]* 7.4 Write property test — year-group balance classification (Property 6)
    - **Property 6: Year-group balance classification**
    - Generate random arrays of `{ section_id, free_class_count }` for a year group; assert `isBalanced(sections)` returns `true` iff all counts are equal
    - **Validates: Requirements 3.2, 4.2, 7.4**

- [ ] 8. Implement `buildValidationReport(entries, sections, allFaculty)`
  - Define as a module-level function
  - Build `faculty` array: for each faculty in `allFaculty`, compute `period_count` from `entries`, set `compliant: period_count >= 15 && period_count <= 18`
  - Build `yearGroups` map: for each year (2, 3), compute `free_class_count` per section, set `balanced` flag
  - Call `buildValidationReport(result.entries, sections, allFaculty)` after `commitToDatabase` and include the report in the return value: `{ message, scheduled_classes, report }`
  - Log the report to console
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 9. Write property-based tests using fast-check
  - Install `fast-check` as a dev dependency: `npm install --save-dev fast-check`
  - Create `backend/services/__tests__/generator.constraints.test.js`
  - Export the pure helper functions (`computeWorkload`, `isCompliant`, `canAssign`, `canAddFree`, `computeFreeCount`, `isBalanced`, `isAvailabilityConflict`) from `generator.js` under a `_test` export or a separate `constraints.js` module so they can be imported in tests
  - Implement all 7 property-based tests as described in the design's Testing Strategy section, each tagged with its property number and requirements clause
  - Run with: `npx jest backend/services/__tests__/generator.constraints.test.js --testRunner=jest-circus`
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 5.2, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4_

- [ ] 10. Write integration test against a small fixture database
  - Create `backend/services/__tests__/generator.integration.test.js`
  - Build a small in-memory SQLite fixture: 2 sections per year (years 2 and 3), 3 faculty, minimal subjects covering all priorities
  - Call `generateTimetable` (or a test-scoped variant that accepts a db connection) and assert:
    - Returned report shows all faculty `compliant: true`
    - Both year groups show `balanced: true`
    - Every section has `free_class_count === 3` (not just <= 3)
  - Add a second fixture that makes workload balancing impossible; assert the generator throws with a descriptive error
  - _Requirements: 1.3, 2.3, 3.2, 4.2, 5.3, 5.4, 6.5, 7.1, 7.2, 7.3, 7.4_

- [ ] 11. Implement `checkAndAutoGenerate()` in `generator.js`
  - Add `const FACULTY_THRESHOLD = 5` as a module-level constant
  - Implement `async function checkAndAutoGenerate()`:
    - Query `SELECT COUNT(DISTINCT faculty_id) AS cnt FROM Subjects WHERE faculty_id IS NOT NULL`
    - If `cnt !== FACULTY_THRESHOLD`, return `{ triggered: false, allocatedCount: cnt }`
    - If `cnt === FACULTY_THRESHOLD`, call `await generateTimetable()` and return `{ triggered: true, result }`
    - Do **not** catch errors — let them propagate to the caller (no automatic retry per Requirement 8.3)
  - Export `checkAndAutoGenerate` alongside `generateTimetable`
  - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 11.1 Write property test — auto-trigger threshold classification (Property 8)
    - **Property 8: Auto-trigger threshold classification**
    - Mock `generateTimetable` and the DB query; generate random integers 0–20 as `allocatedCount`
    - Assert `checkAndAutoGenerate` calls `generateTimetable` if and only if `allocatedCount === 5`
    - Assert it returns `{ triggered: false }` for all other values without calling `generateTimetable`
    - **Validates: Requirements 8.1, 8.2, 8.3**

- [ ] 12. Add `POST /api/timetable/auto-generate` route
  - In `backend/routes/timetable.js`, add a new route below the existing `/generate` handler:
    ```js
    router.post('/auto-generate', async (req, res) => {
        try {
            const outcome = await generatorService.checkAndAutoGenerate();
            if (!outcome.triggered) {
                return res.status(400).json({
                    error: 'Auto-generation threshold not met',
                    allocatedCount: outcome.allocatedCount,
                    required: 5
                });
            }
            res.json(outcome.result);
        } catch (error) {
            console.error('Auto-generate error:', error);
            res.status(500).json({ error: 'Auto-generation failed', details: error.message });
        }
    });
    ```
  - The route reuses the existing `verifyToken` + `isAdmin` middleware already applied at the router level
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 13. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests (tasks 1.1, 2.1, 3.1, 7.1–7.4, 11.1) use `fast-check` and validate the 8 correctness properties from the design document
- `fast-check` must be installed before running property tests (`npm install --save-dev fast-check` in `backend/`)
- Pure helper functions must be exported (or extracted to a sibling module) to be testable in isolation
- Task 7 enforces `freeClassCount === 3` (exact), not just `<= 3` — both under and over-assignment are rejected
- Tasks 11 and 12 implement Requirement 8: `checkAndAutoGenerate` in `generator.js` + `POST /api/timetable/auto-generate` in `timetable.js`
