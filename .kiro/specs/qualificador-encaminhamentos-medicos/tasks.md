# Implementation Plan: Qualificador de Encaminhamentos Médicos

## Overview

This implementation plan breaks down the Medical Referral Qualifier module into discrete, manageable coding tasks. The module integrates with the integrated clinical management platform to automate patient qualification for specialist referrals across three specialties: Endocrinology, Cardiology, and Rheumatology. Each task builds incrementally on previous work, with property-based tests validating correctness properties defined in the design document.

---

## Tasks

- [x] 1. Set up project structure and core data models
  - Create module directory structure under `modules/qualification/`
  - Define TypeScript interfaces for protocols, qualifications, and audit logs
  - Create data models for specialties, questions, and responses
  - Set up localStorage persistence layer
  - _Requirements: 1, 2, 13_

- [x] 2. Implement clinical protocols for three specialties
  - [x] 2.1 Create Endocrinology protocol (Diabetes Mellitus type 2)
    - Define eligibility filters with logic rules
    - Define alert conditions and recommendations
    - Define required exams with age constraints
    - _Requirements: 3, 6, 7, 8_
  
  - [ ]* 2.2 Write property test for Endocrinology protocol
    - **Property 1: Deterministic Eligibility**
    - **Validates: Requirements 6, 7**
  
  - [x] 2.3 Create Cardiology protocol (Hypertension)
    - Define eligibility filters with logic rules
    - Define alert conditions and recommendations
    - Define required exams with age constraints
    - _Requirements: 4, 6, 7, 8_
  
  - [ ]* 2.4 Write property test for Cardiology protocol
    - **Property 1: Deterministic Eligibility**
    - **Validates: Requirements 6, 7**
  
  - [x] 2.5 Create Rheumatology protocol (Lupus, Arthritis, Arthrosis)
    - Define eligibility filters with logic rules
    - Define alert conditions and recommendations
    - Define required exams with age constraints
    - _Requirements: 5, 6, 7, 8_
  
  - [ ]* 2.6 Write property test for Rheumatology protocol
    - **Property 1: Deterministic Eligibility**
    - **Validates: Requirements 6, 7**

- [x] 3. Implement specialty selection modal
  - [x] 3.1 Create modal component with three specialty options
    - Display specialty name, description, and icon
    - Implement selection validation
    - Handle modal open/close lifecycle
    - _Requirements: 2, 14_
  
  - [ ]* 3.2 Write unit tests for specialty selection
    - Test modal rendering with all specialties
    - Test selection validation
    - _Requirements: 2_

- [x] 4. Implement dynamic questionnaire system
  - [x] 4.1 Create questionnaire renderer with section support
    - Render questions with different types (boolean, text, number, select, exam_status)
    - Implement required field validation
    - Support scroll position preservation
    - _Requirements: 3, 4, 5, 10_
  
  - [x] 4.2 Implement data pre-population from consultation transcript
    - Extract demographic data (age, gender, name)
    - Extract diagnoses and medications
    - Extract vital signs and lab results
    - Map extracted data to questionnaire fields
    - _Requirements: 10_
  
  - [ ]* 4.3 Write property test for pre-filled field editability
    - **Property 5: Pre-filled Data Are Editable**
    - **Validates: Requirements 10_
  
  - [x] 4.4 Implement auto-save to localStorage
    - Save responses after each answer
    - Implement debouncing to avoid excessive writes
    - Recover state on page reload
    - _Requirements: 11_
  
  - [ ]* 4.5 Write property test for session state persistence
    - **Property 7: Session State Persists Across Page Reload**
    - **Validates: Requirements 11_

- [x] 5. Implement eligibility analysis engine
  - [x] 5.1 Create EligibilityEngine class with protocol evaluation
    - Implement evaluateEligibilityFilters() method
    - Implement detectAlerts() method
    - Implement validateExams() method
    - Apply decision logic: filters → alerts → exams
    - _Requirements: 6, 7, 8_
  
  - [ ]* 5.2 Write property test for eligibility determinism
    - **Property 1: Deterministic Eligibility**
    - **Validates: Requirements 6_
  
  - [ ]* 5.3 Write property test for alert priority
    - **Property 2: Alerts Have Priority**
    - **Validates: Requirements 7_
  
  - [ ]* 5.4 Write property test for exam validation
    - **Property 3: Required Exams Validate Qualification**
    - **Validates: Requirements 8_
  
  - [ ]* 5.5 Write property test for eligibility filter necessity
    - **Property 4: Eligibility Filters Are Necessary**
    - **Validates: Requirements 6_

- [ ] 6. Implement input validation and security
  - [~] 6.1 Create Validator class with type checking
    - Validate boolean, number, text, select, and exam_status responses
    - Validate questionnaire completeness
    - Implement error message generation
    - _Requirements: 13_
  
  - [~] 6.2 Implement HTML sanitization for user inputs
    - Escape HTML special characters
    - Prevent XSS attacks
    - _Requirements: 13_
  
  - [ ]* 6.3 Write property test for input validation
    - **Property 8: Invalid Input Is Rejected**
    - **Validates: Requirements 13_

- [ ] 7. Implement report generation
  - [~] 7.1 Create ReportGenerator class
    - Generate HTML report with all required sections
    - Include result status, clinical justification, alerts, missing exams
    - Include metadata (date, doctor, clinic, auto-populated fields)
    - _Requirements: 9_
  
  - [~] 7.2 Implement PDF export functionality
    - Convert HTML report to PDF format
    - Include proper formatting and page breaks
    - _Requirements: 9_
  
  - [~] 7.3 Implement print functionality
    - Format report for printing
    - Ensure readability on paper
    - _Requirements: 9_
  
  - [ ]* 7.4 Write property test for report completeness
    - **Property 9: Report Contains All Required Fields**
    - **Validates: Requirements 9_

- [ ] 8. Implement qualification history management
  - [~] 8.1 Create HistoryManager class
    - Save completed qualifications to localStorage
    - Retrieve patient qualification history
    - Implement chronological ordering
    - Support filtering by specialty
    - _Requirements: 12_
  
  - [ ]* 8.2 Write property test for history ordering
    - **Property 10: Qualification History Is Chronologically Ordered**
    - **Validates: Requirements 12_

- [ ] 9. Implement audit logging and compliance
  - [~] 9.1 Create AuditLogger class
    - Log all qualification actions with timestamp and user ID
    - Include IP address and user agent
    - Generate data hash for integrity verification
    - _Requirements: 13_
  
  - [ ]* 9.2 Write property test for audit completeness
    - **Property 6: Audit Logs All Qualifications**
    - **Validates: Requirements 13_

- [x] 10. Integrate qualification module with platform
  - [x] 10.1 Add "Qualificar para Encaminhamento" button to prontuário results
    - Display button after successful prontuário generation
    - Implement click handler to open qualification modal
    - Preserve prontuário data while modal is open
    - _Requirements: 1, 2_
  
  - [~] 10.2 Integrate with patient management system
    - Load patient qualification history when patient is selected
    - Display qualification history section in patient record
    - Support viewing previous qualifications
    - _Requirements: 12_

- [ ] 11. Implement responsive UI and accessibility
  - [~] 11.1 Create qualification-specific styles
    - Implement responsive layout for mobile devices
    - Ensure touch-friendly interface elements
    - Support dark mode if platform supports it
    - _Requirements: 14_
  
  - [~] 11.2 Implement keyboard navigation
    - Support Tab navigation through questionnaire
    - Implement Enter to submit forms
    - Support Escape to close modals
    - _Requirements: 14_

- [x] 12. Checkpoint - Ensure all core functionality tests pass
  - Run all unit tests and property tests (309 testes Jest passando)
  - Verify no console errors or warnings
  - Confirm all requirements are covered
  - Ask the user if questions arise.

- [ ] 13. Implement error handling and recovery
  - [~] 13.1 Create error handler for qualification failures
    - Catch and log errors during analysis
    - Display user-friendly error messages
    - Implement retry mechanisms
    - _Requirements: 13_
  
  - [~] 13.2 Implement recovery from localStorage corruption
    - Validate stored data integrity
    - Recover from partial saves
    - Clear corrupted data safely
    - _Requirements: 11_

- [ ] 14. Implement protocol management and caching
  - [~] 14.1 Create ProtocolManager class
    - Load protocols on demand
    - Cache protocols after first load
    - Support protocol versioning
    - _Requirements: 2_
  
  - [~] 14.2 Implement questionnaire caching
    - Cache rendered questionnaires
    - Invalidate cache on protocol updates
    - _Requirements: 3, 4, 5_

- [ ] 15. Create comprehensive integration tests
  - [~] 15.1 Test complete qualification flow for Endocrinology
    - Select specialty → answer questions → analyze → generate report
    - Verify all decision paths work correctly
    - _Requirements: 1, 3, 6, 7, 8, 9_
  
  - [~] 15.2 Test complete qualification flow for Cardiology
    - Select specialty → answer questions → analyze → generate report
    - Verify all decision paths work correctly
    - _Requirements: 1, 4, 6, 7, 8, 9_
  
  - [~] 15.3 Test complete qualification flow for Rheumatology
    - Select specialty → answer questions → analyze → generate report
    - Verify all decision paths work correctly
    - _Requirements: 1, 5, 6, 7, 8, 9_

- [~] 16. Final checkpoint - Ensure all tests pass and requirements met
  - Run complete test suite including property tests
  - Verify all requirements are implemented
  - Check for any console errors or warnings
  - Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Property-based tests validate universal correctness properties defined in the design document
- Unit tests validate specific examples and edge cases
- Integration tests verify end-to-end workflows
- All code follows JavaScript ES6+ standards as specified in the design
- localStorage is used for all persistence (no backend required)
- LGPD/HIPAA compliance is maintained through input validation, sanitization, and audit logging

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.3", "2.5"] },
    { "id": 2, "tasks": ["2.2", "2.4", "2.6", "3.1"] },
    { "id": 3, "tasks": ["3.2", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.4"] },
    { "id": 5, "tasks": ["4.3", "4.5", "5.1"] },
    { "id": 6, "tasks": ["5.2", "5.3", "5.4", "5.5", "6.1"] },
    { "id": 7, "tasks": ["6.2", "6.3", "7.1"] },
    { "id": 8, "tasks": ["7.2", "7.3", "7.4", "8.1"] },
    { "id": 9, "tasks": ["8.2", "9.1"] },
    { "id": 10, "tasks": ["9.2", "10.1"] },
    { "id": 11, "tasks": ["10.2", "11.1"] },
    { "id": 12, "tasks": ["11.2", "13.1"] },
    { "id": 13, "tasks": ["13.2", "14.1"] },
    { "id": 14, "tasks": ["14.2", "15.1"] },
    { "id": 15, "tasks": ["15.2", "15.3"] }
  ]
}
```
