/**
 * Tests for QuestionnaireRenderer
 * Unit tests for questionnaire rendering, validation, and state management
 */

const QuestionnaireRenderer = require('./questionnaire-renderer');

describe('QuestionnaireRenderer', () => {
  let renderer;
  let container;
  let mockQuestionnaire;

  beforeEach(() => {
    // Create container
    container = document.createElement('div');
    container.id = 'questionnaire-container';
    document.body.appendChild(container);

    // Create renderer
    renderer = new QuestionnaireRenderer({
      containerId: 'questionnaire-container',
      autoSave: false // Disable auto-save for tests
    });

    // Mock questionnaire
    mockQuestionnaire = {
      id: 'test-questionnaire',
      sections: [
        {
          id: 'section-1',
          title: 'Section 1',
          description: 'Test section',
          questions: [
            {
              id: 'q1',
              text: 'Boolean question?',
              type: 'boolean',
              required: true
            },
            {
              id: 'q2',
              text: 'Text question?',
              type: 'text',
              required: true,
              maxLength: 100
            },
            {
              id: 'q3',
              text: 'Number question?',
              type: 'number',
              required: false,
              min: 0,
              max: 100
            },
            {
              id: 'q4',
              text: 'Select question?',
              type: 'select',
              required: true,
              options: ['Option 1', 'Option 2', 'Option 3']
            },
            {
              id: 'q5',
              text: 'Exam status?',
              type: 'exam_status',
              required: true,
              options: ['Não Realizado', 'Realizado', 'Resultado Disponível']
            }
          ]
        }
      ]
    };
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    localStorage.clear();
  });

  // ========================================================================
  // RENDERING TESTS
  // ========================================================================

  describe('Rendering', () => {
    test('should render questionnaire with sections', () => {
      renderer.render(mockQuestionnaire);

      const wrapper = container.querySelector('.questionnaire-wrapper');
      expect(wrapper).toBeTruthy();
      expect(wrapper.getAttribute('data-questionnaire-id')).toBe('test-questionnaire');
    });

    test('should render all sections', () => {
      renderer.render(mockQuestionnaire);

      const sections = container.querySelectorAll('.questionnaire-section');
      expect(sections.length).toBe(mockQuestionnaire.sections.length);
    });

    test('should render section titles', () => {
      renderer.render(mockQuestionnaire);

      const title = container.querySelector('.section-title');
      expect(title.textContent).toBe('Section 1');
    });

    test('should render section descriptions', () => {
      renderer.render(mockQuestionnaire);

      const description = container.querySelector('.section-description');
      expect(description.textContent).toBe('Test section');
    });

    test('should render all questions', () => {
      renderer.render(mockQuestionnaire);

      const questions = container.querySelectorAll('.question-wrapper');
      expect(questions.length).toBe(mockQuestionnaire.sections[0].questions.length);
    });

    test('should render question labels', () => {
      renderer.render(mockQuestionnaire);

      const labels = container.querySelectorAll('.question-label');
      expect(labels.length).toBe(5);
      expect(labels[0].textContent).toContain('Boolean question?');
    });

    test('should mark required questions with indicator', () => {
      renderer.render(mockQuestionnaire);

      const requiredIndicators = container.querySelectorAll('.required-indicator');
      expect(requiredIndicators.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // BOOLEAN INPUT TESTS
  // ========================================================================

  describe('Boolean Input', () => {
    test('should render yes/no buttons', () => {
      renderer.render(mockQuestionnaire);

      const buttons = container.querySelectorAll('.boolean-button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    test('should handle yes button click', () => {
      renderer.render(mockQuestionnaire);

      const yesButton = container.querySelector('.yes-button');
      yesButton.click();

      expect(renderer.responses.q1).toBe(true);
      expect(yesButton.classList.contains('active')).toBe(true);
    });

    test('should handle no button click', () => {
      renderer.render(mockQuestionnaire);

      const noButton = container.querySelector('.no-button');
      noButton.click();

      expect(renderer.responses.q1).toBe(false);
      expect(noButton.classList.contains('active')).toBe(true);
    });

    test('should toggle button states', () => {
      renderer.render(mockQuestionnaire);

      const yesButton = container.querySelector('.yes-button');
      const noButton = container.querySelector('.no-button');

      yesButton.click();
      expect(yesButton.classList.contains('active')).toBe(true);
      expect(noButton.classList.contains('active')).toBe(false);

      noButton.click();
      expect(yesButton.classList.contains('active')).toBe(false);
      expect(noButton.classList.contains('active')).toBe(true);
    });
  });

  // ========================================================================
  // TEXT INPUT TESTS
  // ========================================================================

  describe('Text Input', () => {
    test('should render text input', () => {
      renderer.render(mockQuestionnaire);

      const input = container.querySelector('input[type="text"]');
      expect(input).toBeTruthy();
    });

    test('should handle text input change', () => {
      renderer.render(mockQuestionnaire);

      const input = container.querySelector('input[type="text"]');
      input.value = 'Test text';
      input.dispatchEvent(new Event('input'));

      expect(renderer.responses.q2).toBe('Test text');
    });

    test('should respect maxLength attribute', () => {
      renderer.render(mockQuestionnaire);

      const input = container.querySelector('input[type="text"]');
      expect(input.maxLength).toBe(100);
    });
  });

  // ========================================================================
  // NUMBER INPUT TESTS
  // ========================================================================

  describe('Number Input', () => {
    test('should render number input', () => {
      renderer.render(mockQuestionnaire);

      const input = container.querySelector('input[type="number"]');
      expect(input).toBeTruthy();
    });

    test('should handle number input change', () => {
      renderer.render(mockQuestionnaire);

      const input = container.querySelector('input[type="number"]');
      input.value = '42';
      input.dispatchEvent(new Event('input'));

      expect(renderer.responses.q3).toBe(42);
    });

    test('should respect min and max attributes', () => {
      renderer.render(mockQuestionnaire);

      const input = container.querySelector('input[type="number"]');
      expect(input.min).toBe('0');
      expect(input.max).toBe('100');
    });
  });

  // ========================================================================
  // SELECT INPUT TESTS
  // ========================================================================

  describe('Select Input', () => {
    test('should render select input', () => {
      renderer.render(mockQuestionnaire);

      const selects = container.querySelectorAll('select');
      expect(selects.length).toBeGreaterThan(0);
    });

    test('should render all options', () => {
      renderer.render(mockQuestionnaire);

      const select = container.querySelector('select');
      const options = select.querySelectorAll('option');
      expect(options.length).toBe(4); // 1 default + 3 options
    });

    test('should handle select change', () => {
      renderer.render(mockQuestionnaire);

      const select = container.querySelector('select');
      select.value = 'Option 2';
      select.dispatchEvent(new Event('change'));

      expect(renderer.responses.q4).toBe('Option 2');
    });
  });

  // ========================================================================
  // EXAM STATUS INPUT TESTS
  // ========================================================================

  describe('Exam Status Input', () => {
    test('should render exam status select', () => {
      renderer.render(mockQuestionnaire);

      const examSelect = container.querySelector('.exam-status-select');
      expect(examSelect).toBeTruthy();
    });

    test('should have exam status options', () => {
      renderer.render(mockQuestionnaire);

      const examSelect = container.querySelector('.exam-status-select');
      const options = examSelect.querySelectorAll('option');
      expect(options.length).toBe(4); // 1 default + 3 status options
    });

    test('should handle exam status change', () => {
      renderer.render(mockQuestionnaire);

      const examSelect = container.querySelector('.exam-status-select');
      examSelect.value = 'Resultado Disponível';
      examSelect.dispatchEvent(new Event('change'));

      expect(renderer.responses.q5).toBe('Resultado Disponível');
    });
  });

  // ========================================================================
  // VALIDATION TESTS
  // ========================================================================

  describe('Validation', () => {
    test('should validate required boolean field', () => {
      renderer.render(mockQuestionnaire);

      const question = mockQuestionnaire.sections[0].questions[0];
      const isValid = renderer.validateQuestion(question);

      expect(isValid).toBe(false);
    });

    test('should validate required text field', () => {
      renderer.render(mockQuestionnaire);

      const question = mockQuestionnaire.sections[0].questions[1];
      const isValid = renderer.validateQuestion(question);

      expect(isValid).toBe(false);
    });

    test('should pass validation for optional field', () => {
      renderer.render(mockQuestionnaire);

      const question = mockQuestionnaire.sections[0].questions[2];
      const isValid = renderer.validateQuestion(question);

      expect(isValid).toBe(true);
    });

    test('should validate number range', () => {
      renderer.render(mockQuestionnaire);

      renderer.responses.q3 = 150; // Exceeds max of 100
      const question = mockQuestionnaire.sections[0].questions[2];
      const isValid = renderer.validateQuestion(question);

      expect(isValid).toBe(false);
    });

    test('should validate all questions', () => {
      renderer.render(mockQuestionnaire);

      const result = renderer.validateAll();
      expect(result.valid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    });

    test('should pass validation when all required fields filled', () => {
      renderer.render(mockQuestionnaire);

      renderer.responses.q1 = true;
      renderer.responses.q2 = 'Test';
      renderer.responses.q4 = 'Option 1';
      renderer.responses.q5 = 'Realizado';

      const result = renderer.validateAll();
      expect(result.valid).toBe(true);
    });

    test('should set validation error', () => {
      renderer.render(mockQuestionnaire);

      renderer.setValidationError('q1', 'This field is required');

      const errorContainer = container.querySelector('.error-message[data-question-id="q1"]');
      expect(errorContainer.textContent).toBe('This field is required');
      expect(errorContainer.style.display).not.toBe('none');
    });

    test('should clear validation error', () => {
      renderer.render(mockQuestionnaire);

      renderer.setValidationError('q1', 'Error');
      renderer.clearValidationError('q1');

      const errorContainer = container.querySelector('.error-message[data-question-id="q1"]');
      expect(errorContainer.textContent).toBe('');
      expect(errorContainer.style.display).toBe('none');
    });

    test('should add error class to question wrapper', () => {
      renderer.render(mockQuestionnaire);

      renderer.setValidationError('q1', 'Error');

      const wrapper = container.querySelector('.question-wrapper[data-question-id="q1"]');
      expect(wrapper.classList.contains('error')).toBe(true);
    });
  });

  // ========================================================================
  // RESPONSE MANAGEMENT TESTS
  // ========================================================================

  describe('Response Management', () => {
    test('should get all responses', () => {
      renderer.render(mockQuestionnaire);

      renderer.responses.q1 = true;
      renderer.responses.q2 = 'Test';

      const responses = renderer.getResponses();
      expect(responses.q1).toBe(true);
      expect(responses.q2).toBe('Test');
    });

    test('should set responses', () => {
      renderer.render(mockQuestionnaire);

      const newResponses = {
        q1: true,
        q2: 'New text',
        q3: 50
      };

      renderer.setResponses(newResponses);

      expect(renderer.responses.q1).toBe(true);
      expect(renderer.responses.q2).toBe('New text');
      expect(renderer.responses.q3).toBe(50);
    });

    test('should reset responses', () => {
      renderer.render(mockQuestionnaire);

      renderer.responses.q1 = true;
      renderer.responses.q2 = 'Test';

      renderer.reset();

      expect(Object.keys(renderer.responses).length).toBe(0);
    });
  });

  // ========================================================================
  // STATE PERSISTENCE TESTS
  // ========================================================================

  describe('State Persistence', () => {
    test('should save state to localStorage', () => {
      renderer.render(mockQuestionnaire);

      renderer.responses.q1 = true;
      renderer.responses.q2 = 'Test';
      renderer.saveState();

      const stored = localStorage.getItem('questionnaire_state');
      expect(stored).toBeTruthy();

      const state = JSON.parse(stored);
      expect(state.responses.q1).toBe(true);
      expect(state.responses.q2).toBe('Test');
    });

    test('should load state from localStorage', () => {
      const testState = {
        responses: {
          q1: true,
          q2: 'Loaded text'
        },
        timestamp: Date.now(),
        scrollPosition: 100
      };

      localStorage.setItem('questionnaire_state', JSON.stringify(testState));

      const loadedState = renderer.loadState();
      expect(loadedState.responses.q1).toBe(true);
      expect(loadedState.responses.q2).toBe('Loaded text');
    });

    test('should clear state from localStorage', () => {
      renderer.render(mockQuestionnaire);
      renderer.responses.q1 = true;
      renderer.saveState();

      renderer.clearState();

      const stored = localStorage.getItem('questionnaire_state');
      expect(stored).toBeNull();
    });

    test('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage full');
      });

      renderer.render(mockQuestionnaire);
      renderer.responses.q1 = true;

      // Should not throw
      expect(() => renderer.saveState()).not.toThrow();

      // Restore
      localStorage.setItem = originalSetItem;
    });
  });

  // ========================================================================
  // SCROLL POSITION TESTS
  // ========================================================================

  describe('Scroll Position', () => {
    test('should track scroll position', () => {
      renderer.render(mockQuestionnaire);

      renderer.scrollContainer.scrollTop = 100;
      renderer.scrollContainer.dispatchEvent(new Event('scroll'));

      expect(renderer.lastScrollPosition).toBe(100);
    });

    test('should restore scroll position', () => {
      const testState = {
        responses: {},
        timestamp: Date.now(),
        scrollPosition: 200
      };

      localStorage.setItem('questionnaire_state', JSON.stringify(testState));

      renderer.render(mockQuestionnaire);

      // Wait for setTimeout in restoreScrollPosition
      return new Promise(resolve => {
        setTimeout(() => {
          expect(renderer.scrollContainer.scrollTop).toBe(200);
          resolve();
        }, 10);
      });
    });
  });

  // ========================================================================
  // PRE-FILLING TESTS
  // ========================================================================

  describe('Pre-filling', () => {
    test('should pre-fill responses on render', () => {
      const initialResponses = {
        q1: true,
        q2: 'Pre-filled text',
        q3: 50
      };

      renderer.render(mockQuestionnaire, initialResponses);

      expect(renderer.responses.q1).toBe(true);
      expect(renderer.responses.q2).toBe('Pre-filled text');
      expect(renderer.responses.q3).toBe(50);
    });

    test('should display pre-filled values in inputs', () => {
      const initialResponses = {
        q2: 'Pre-filled text'
      };

      renderer.render(mockQuestionnaire, initialResponses);

      const textInput = container.querySelector('input[type="text"]');
      expect(textInput.value).toBe('Pre-filled text');
    });

    test('should display pre-filled boolean value', () => {
      const initialResponses = {
        q1: true
      };

      renderer.render(mockQuestionnaire, initialResponses);

      const yesButton = container.querySelector('.yes-button');
      expect(yesButton.classList.contains('active')).toBe(true);
    });
  });

  // ========================================================================
  // CALLBACK TESTS
  // ========================================================================

  describe('Callbacks', () => {
    test('should call onResponseChange callback', () => {
      const onResponseChange = jest.fn();
      renderer.onResponseChange = onResponseChange;

      renderer.render(mockQuestionnaire);

      const yesButton = container.querySelector('.yes-button');
      yesButton.click();

      expect(onResponseChange).toHaveBeenCalledWith('q1', true);
    });

    test('should call onValidationChange callback', () => {
      const onValidationChange = jest.fn();
      renderer.onValidationChange = onValidationChange;

      renderer.render(mockQuestionnaire);

      renderer.validateAll();

      expect(onValidationChange).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // EDGE CASES
  // ========================================================================

  describe('Edge Cases', () => {
    test('should handle empty questionnaire', () => {
      const emptyQuestionnaire = {
        id: 'empty',
        sections: []
      };

      expect(() => renderer.render(emptyQuestionnaire)).not.toThrow();
    });

    test('should handle section without description', () => {
      const questionnaire = {
        id: 'test',
        sections: [
          {
            id: 'section-1',
            title: 'Section',
            questions: []
          }
        ]
      };

      expect(() => renderer.render(questionnaire)).not.toThrow();
    });

    test('should handle question without hint', () => {
      const questionnaire = {
        id: 'test',
        sections: [
          {
            id: 'section-1',
            title: 'Section',
            questions: [
              {
                id: 'q1',
                text: 'Question',
                type: 'text',
                required: true
              }
            ]
          }
        ]
      };

      expect(() => renderer.render(questionnaire)).not.toThrow();
    });

    test('should handle missing container', () => {
      const badRenderer = new QuestionnaireRenderer({
        containerId: 'non-existent-container'
      });

      expect(() => badRenderer.render(mockQuestionnaire)).not.toThrow();
    });

    test('should handle invalid question type', () => {
      const questionnaire = {
        id: 'test',
        sections: [
          {
            id: 'section-1',
            title: 'Section',
            questions: [
              {
                id: 'q1',
                text: 'Question',
                type: 'invalid_type',
                required: true
              }
            ]
          }
        ]
      };

      expect(() => renderer.render(questionnaire)).not.toThrow();
    });
  });

  // ========================================================================
  // ACCESSIBILITY TESTS
  // ========================================================================

  describe('Accessibility', () => {
    test('should have proper label associations', () => {
      renderer.render(mockQuestionnaire);

      const labels = container.querySelectorAll('.question-label');
      labels.forEach(label => {
        const htmlFor = label.getAttribute('for');
        expect(htmlFor).toBeTruthy();
      });
    });

    test('should have required indicator with aria-label', () => {
      renderer.render(mockQuestionnaire);

      const requiredIndicators = container.querySelectorAll('.required-indicator');
      requiredIndicators.forEach(indicator => {
        expect(indicator.getAttribute('aria-label')).toBeTruthy();
      });
    });

    test('should support keyboard navigation', () => {
      renderer.render(mockQuestionnaire);

      const inputs = container.querySelectorAll('input, select, button');
      expect(inputs.length).toBeGreaterThan(0);

      inputs.forEach(input => {
        expect(input.tabIndex).toBeGreaterThanOrEqual(-1);
      });
    });
  });

  // ========================================================================
  // AUTO-SAVE AND DEBOUNCING TESTS
  // ========================================================================

  describe('Auto-save with Debouncing', () => {
    test('should auto-save responses after debounce delay', (done) => {
      const rendererWithAutoSave = new QuestionnaireRenderer({
        containerId: 'questionnaire-container',
        autoSave: true,
        debounceDelay: 100
      });

      rendererWithAutoSave.render(mockQuestionnaire);

      const yesButton = container.querySelector('.yes-button');
      yesButton.click();

      // Wait for debounce delay
      setTimeout(() => {
        const stored = localStorage.getItem('questionnaire_state');
        expect(stored).toBeTruthy();

        const state = JSON.parse(stored);
        expect(state.responses.q1).toBe(true);
        done();
      }, 150);
    });

    test('should debounce multiple rapid changes', (done) => {
      const rendererWithAutoSave = new QuestionnaireRenderer({
        containerId: 'questionnaire-container',
        autoSave: true,
        debounceDelay: 100
      });

      rendererWithAutoSave.render(mockQuestionnaire);

      const textInput = container.querySelector('input[type="text"]');

      // Simulate rapid typing
      textInput.value = 'a';
      textInput.dispatchEvent(new Event('input'));

      textInput.value = 'ab';
      textInput.dispatchEvent(new Event('input'));

      textInput.value = 'abc';
      textInput.dispatchEvent(new Event('input'));

      // Wait for debounce delay
      setTimeout(() => {
        const stored = localStorage.getItem('questionnaire_state');
        const state = JSON.parse(stored);
        expect(state.responses.q2).toBe('abc');
        done();
      }, 150);
    });

    test('should save state immediately when saveStateImmediate is called', () => {
      const rendererWithAutoSave = new QuestionnaireRenderer({
        containerId: 'questionnaire-container',
        autoSave: true,
        debounceDelay: 5000 // Long delay
      });

      rendererWithAutoSave.render(mockQuestionnaire);

      const yesButton = container.querySelector('.yes-button');
      yesButton.click();

      // Call immediate save
      rendererWithAutoSave.saveStateImmediate();

      const stored = localStorage.getItem('questionnaire_state');
      expect(stored).toBeTruthy();

      const state = JSON.parse(stored);
      expect(state.responses.q1).toBe(true);
    });

    test('should not auto-save when autoSave is disabled', (done) => {
      const rendererNoAutoSave = new QuestionnaireRenderer({
        containerId: 'questionnaire-container',
        autoSave: false
      });

      localStorage.clear();
      rendererNoAutoSave.render(mockQuestionnaire);

      const yesButton = container.querySelector('.yes-button');
      yesButton.click();

      setTimeout(() => {
        const stored = localStorage.getItem('questionnaire_state');
        expect(stored).toBeNull();
        done();
      }, 150);
    });

    test('should clear debounce timer when saveStateImmediate is called', (done) => {
      const rendererWithAutoSave = new QuestionnaireRenderer({
        containerId: 'questionnaire-container',
        autoSave: true,
        debounceDelay: 200
      });

      rendererWithAutoSave.render(mockQuestionnaire);

      const yesButton = container.querySelector('.yes-button');
      yesButton.click();

      // Immediately save before debounce fires
      rendererWithAutoSave.saveStateImmediate();

      // Wait less than debounce delay
      setTimeout(() => {
        const stored = localStorage.getItem('questionnaire_state');
        expect(stored).toBeTruthy();
        done();
      }, 50);
    });
  });

  // ========================================================================
  // STATE RECOVERY TESTS
  // ========================================================================

  describe('State Recovery', () => {
    test('should recover state on render', () => {
      const testState = {
        responses: {
          q1: true,
          q2: 'Recovered text'
        },
        timestamp: Date.now(),
        scrollPosition: 100,
        questionnaireId: 'test-questionnaire',
        questionnaireSections: 1
      };

      localStorage.setItem('questionnaire_state', JSON.stringify(testState));

      const newRenderer = new QuestionnaireRenderer({
        containerId: 'questionnaire-container'
      });

      newRenderer.render(mockQuestionnaire);

      expect(newRenderer.responses.q1).toBe(true);
      expect(newRenderer.responses.q2).toBe('Recovered text');
    });

    test('should validate state before recovery', () => {
      const invalidState = {
        responses: null, // Invalid
        timestamp: Date.now()
      };

      localStorage.setItem('questionnaire_state', JSON.stringify(invalidState));

      const newRenderer = new QuestionnaireRenderer({
        containerId: 'questionnaire-container'
      });

      newRenderer.render(mockQuestionnaire);

      // Should not recover invalid state
      expect(Object.keys(newRenderer.responses).length).toBe(0);
    });

    test('should reject state older than 24 hours', () => {
      const oldState = {
        responses: {
          q1: true
        },
        timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours old
        scrollPosition: 0
      };

      localStorage.setItem('questionnaire_state', JSON.stringify(oldState));

      const newRenderer = new QuestionnaireRenderer({
        containerId: 'questionnaire-container'
      });

      newRenderer.render(mockQuestionnaire);

      // Should not recover old state
      expect(Object.keys(newRenderer.responses).length).toBe(0);
    });

    test('should use initial responses if no recovered state', () => {
      localStorage.clear();

      const initialResponses = {
        q1: true,
        q2: 'Initial text'
      };

      renderer.render(mockQuestionnaire, initialResponses);

      expect(renderer.responses.q1).toBe(true);
      expect(renderer.responses.q2).toBe('Initial text');
    });

    test('should prefer recovered state over initial responses', () => {
      const recoveredState = {
        responses: {
          q1: false,
          q2: 'Recovered'
        },
        timestamp: Date.now(),
        scrollPosition: 0
      };

      localStorage.setItem('questionnaire_state', JSON.stringify(recoveredState));

      const initialResponses = {
        q1: true,
        q2: 'Initial'
      };

      const newRenderer = new QuestionnaireRenderer({
        containerId: 'questionnaire-container'
      });

      newRenderer.render(mockQuestionnaire, initialResponses);

      // Should use recovered state, not initial
      expect(newRenderer.responses.q1).toBe(false);
      expect(newRenderer.responses.q2).toBe('Recovered');
    });

    test('should include questionnaire metadata in saved state', () => {
      renderer.render(mockQuestionnaire);

      renderer.responses.q1 = true;
      renderer.saveState();

      const stored = localStorage.getItem('questionnaire_state');
      const state = JSON.parse(stored);

      expect(state.questionnaireId).toBe('test-questionnaire');
      expect(state.questionnaireSections).toBe(1);
    });
  });

  // ========================================================================
  // PAGE UNLOAD HANDLER TESTS
  // ========================================================================

  describe('Page Unload Handler', () => {
    test('should set up unload handler on render', () => {
      renderer.render(mockQuestionnaire);

      expect(renderer.unloadHandler).toBeTruthy();
    });

    test('should save state on beforeunload event', () => {
      renderer.render(mockQuestionnaire);

      renderer.responses.q1 = true;

      // Simulate beforeunload event
      const event = new Event('beforeunload');
      window.dispatchEvent(event);

      const stored = localStorage.getItem('questionnaire_state');
      expect(stored).toBeTruthy();

      const state = JSON.parse(stored);
      expect(state.responses.q1).toBe(true);
    });

    test('should remove unload handler on reset', () => {
      renderer.render(mockQuestionnaire);

      const handler = renderer.unloadHandler;
      expect(handler).toBeTruthy();

      renderer.reset();

      expect(renderer.unloadHandler).toBeNull();
    });

    test('should replace previous unload handler', () => {
      renderer.render(mockQuestionnaire);
      const firstHandler = renderer.unloadHandler;

      renderer.render(mockQuestionnaire);
      const secondHandler = renderer.unloadHandler;

      // Should be different handlers
      expect(firstHandler).not.toBe(secondHandler);
    });
  });

  // ========================================================================
  // STORAGE QUOTA TESTS
  // ========================================================================

  describe('Storage Quota Handling', () => {
    test('should handle storage quota exceeded error', () => {
      const rendererWithAutoSave = new QuestionnaireRenderer({
        containerId: 'questionnaire-container',
        autoSave: true
      });

      // Mock localStorage to throw quota exceeded error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      rendererWithAutoSave.render(mockQuestionnaire);
      rendererWithAutoSave.responses.q1 = true;

      // Should not throw
      expect(() => rendererWithAutoSave.saveState()).not.toThrow();

      // Restore
      localStorage.setItem = originalSetItem;
    });

    test('should return false when save fails', () => {
      const rendererWithAutoSave = new QuestionnaireRenderer({
        containerId: 'questionnaire-container',
        autoSave: false
      });

      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      });

      rendererWithAutoSave.render(mockQuestionnaire);
      const result = rendererWithAutoSave.saveState();

      expect(result).toBe(false);

      setItemSpy.mockRestore();
    });

    test('should return true when save succeeds', () => {
      renderer.render(mockQuestionnaire);
      renderer.responses.q1 = true;

      const result = renderer.saveState();

      expect(result).toBe(true);
    });
  });

  // ========================================================================
  // INTEGRATION TESTS
  // ========================================================================

  describe('Auto-save Integration', () => {
    test('should recover state after page reload simulation', () => {
      // First session: user fills form
      const renderer1 = new QuestionnaireRenderer({
        containerId: 'questionnaire-container',
        autoSave: true,
        debounceDelay: 50
      });

      renderer1.render(mockQuestionnaire);

      const yesButton = container.querySelector('.yes-button');
      yesButton.click();

      const textInput = container.querySelector('input[type="text"]');
      textInput.value = 'Test data';
      textInput.dispatchEvent(new Event('input'));

      // Wait for auto-save
      return new Promise(resolve => {
        setTimeout(() => {
          // Simulate page reload: clear DOM but keep localStorage
          if (container.parentNode) {
            container.parentNode.removeChild(container);
          }
          const newContainer = document.createElement('div');
          newContainer.id = 'questionnaire-container';
          document.body.appendChild(newContainer);
          container = newContainer;

          // Second session: new renderer loads state
          const renderer2 = new QuestionnaireRenderer({
            containerId: 'questionnaire-container',
            autoSave: true
          });

          renderer2.render(mockQuestionnaire);

          // Verify state was recovered
          expect(renderer2.responses.q1).toBe(true);
          expect(renderer2.responses.q2).toBe('Test data');

          resolve();
        }, 100);
      });
    });

    test('should handle multiple questionnaires independently', () => {
      const questionnaire2 = {
        id: 'test-questionnaire-2',
        sections: [
          {
            id: 'section-2',
            title: 'Section 2',
            questions: [
              {
                id: 'q10',
                text: 'Question 10?',
                type: 'boolean',
                required: true
              }
            ]
          }
        ]
      };

      // First questionnaire
      renderer.render(mockQuestionnaire);
      renderer.responses.q1 = true;
      renderer.saveState();

      // Second questionnaire with different storage prefix
      const renderer2 = new QuestionnaireRenderer({
        containerId: 'questionnaire-container',
        storagePrefix: 'questionnaire_2_'
      });

      renderer2.render(questionnaire2);
      renderer2.responses.q10 = false;
      renderer2.saveState();

      // Verify both states are saved independently
      const state1 = JSON.parse(localStorage.getItem('questionnaire_state'));
      const state2 = JSON.parse(localStorage.getItem('questionnaire_2_state'));

      expect(state1.responses.q1).toBe(true);
      expect(state2.responses.q10).toBe(false);
    });
  });
});
