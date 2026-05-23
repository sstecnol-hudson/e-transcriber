/**
 * Questionnaire Renderer
 * Renders dynamic questionnaires with support for multiple question types,
 * validation, and scroll position preservation
 */

class QuestionnaireRenderer {
  constructor(options = {}) {
    this.containerId = options.containerId || 'questionnaire-container';
    this.questionnaire = null;
    this.responses = {};
    this.scrollPositions = {};
    this.validationErrors = {};
    this.onResponseChange = options.onResponseChange || (() => {});
    this.onValidationChange = options.onValidationChange || (() => {});
    this.storagePrefix = options.storagePrefix || 'questionnaire_';
    this.autoSave = options.autoSave !== false;
    this.debounceDelay = options.debounceDelay || 500;
    this.debounceTimers = {};
    
    // Scroll position tracking
    this.scrollContainer = null;
    this.lastScrollPosition = 0;
  }

  /**
   * Renders a questionnaire with sections and questions
   * @param {Object} questionnaire - Questionnaire structure with sections
   * @param {Object} initialResponses - Initial responses to pre-fill
   */
  render(questionnaire, initialResponses = {}) {
    this.questionnaire = questionnaire;
    
    // Try to recover state from localStorage first
    const recoveredState = this.recoverState();
    if (recoveredState && recoveredState.responses) {
      this.responses = { ...recoveredState.responses };
      console.log('✅ Recovered questionnaire state from localStorage');
    } else {
      // Use initial responses if no recovered state
      this.responses = { ...initialResponses };
    }
    
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`Container with ID "${this.containerId}" not found`);
      return;
    }

    // Clear previous content
    container.innerHTML = '';
    
    // Create main questionnaire wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'questionnaire-wrapper';
    wrapper.setAttribute('data-questionnaire-id', questionnaire.id || 'unknown');
    
    // Create sections
    questionnaire.sections.forEach((section, sectionIndex) => {
      const sectionElement = this.renderSection(section, sectionIndex);
      wrapper.appendChild(sectionElement);
    });
    
    container.appendChild(wrapper);
    
    // Set up scroll container reference
    this.scrollContainer = container;
    
    // Restore scroll position if available
    this.restoreScrollPosition();
    
    // Add scroll event listener for tracking
    this.scrollContainer.addEventListener('scroll', () => {
      this.lastScrollPosition = this.scrollContainer.scrollTop;
    });
    
    // Set up page unload handler to save state immediately
    this.setupUnloadHandler();
  }

  /**
   * Renders a single section with its questions
   * @param {Object} section - Section object
   * @param {number} sectionIndex - Index of the section
   * @returns {HTMLElement} Section element
   */
  renderSection(section, sectionIndex) {
    const sectionElement = document.createElement('div');
    sectionElement.className = 'questionnaire-section';
    sectionElement.setAttribute('data-section-id', section.id);
    sectionElement.setAttribute('data-section-index', sectionIndex);
    
    // Section header
    const header = document.createElement('div');
    header.className = 'section-header';
    
    const title = document.createElement('h2');
    title.className = 'section-title';
    title.textContent = section.title;
    header.appendChild(title);
    
    if (section.description) {
      const description = document.createElement('p');
      description.className = 'section-description';
      description.textContent = section.description;
      header.appendChild(description);
    }
    
    sectionElement.appendChild(header);
    
    // Questions container
    const questionsContainer = document.createElement('div');
    questionsContainer.className = 'section-questions';
    
    section.questions.forEach((question, questionIndex) => {
      const questionElement = this.renderQuestion(question, section.id, questionIndex);
      questionsContainer.appendChild(questionElement);
    });
    
    sectionElement.appendChild(questionsContainer);
    
    return sectionElement;
  }

  /**
   * Renders a single question based on its type
   * @param {Object} question - Question object
   * @param {string} sectionId - ID of parent section
   * @param {number} questionIndex - Index of question in section
   * @returns {HTMLElement} Question element
   */
  renderQuestion(question, sectionId, questionIndex) {
    const questionElement = document.createElement('div');
    questionElement.className = 'question-wrapper';
    questionElement.setAttribute('data-question-id', question.id);
    questionElement.setAttribute('data-question-type', question.type);
    questionElement.setAttribute('data-section-id', sectionId);
    
    // Add required indicator
    if (question.required) {
      questionElement.classList.add('required');
    }
    
    // Question label
    const label = document.createElement('label');
    label.className = 'question-label';
    label.setAttribute('for', `question_${question.id}`);
    
    const labelText = document.createElement('span');
    labelText.className = 'label-text';
    labelText.textContent = question.text;
    label.appendChild(labelText);
    
    if (question.required) {
      const requiredIndicator = document.createElement('span');
      requiredIndicator.className = 'required-indicator';
      requiredIndicator.textContent = '*';
      requiredIndicator.setAttribute('aria-label', 'Campo obrigatório');
      label.appendChild(requiredIndicator);
    }
    
    questionElement.appendChild(label);
    
    // Render input based on type
    let inputElement;
    switch (question.type) {
      case 'boolean':
        inputElement = this.renderBooleanInput(question);
        break;
      case 'text':
        inputElement = this.renderTextInput(question);
        break;
      case 'number':
        inputElement = this.renderNumberInput(question);
        break;
      case 'select':
        inputElement = this.renderSelectInput(question);
        break;
      case 'exam_status':
        inputElement = this.renderExamStatusInput(question);
        break;
      default:
        inputElement = this.renderTextInput(question);
    }
    
    questionElement.appendChild(inputElement);
    
    // Hint text
    if (question.hint) {
      const hint = document.createElement('p');
      hint.className = 'question-hint';
      hint.textContent = question.hint;
      questionElement.appendChild(hint);
    }
    
    // Error message placeholder
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-message';
    errorContainer.setAttribute('data-question-id', question.id);
    errorContainer.style.display = 'none';
    questionElement.appendChild(errorContainer);
    
    return questionElement;
  }

  /**
   * Renders a boolean (yes/no) input
   * @param {Object} question - Question object
   * @returns {HTMLElement} Input element
   */
  renderBooleanInput(question) {
    const container = document.createElement('div');
    container.className = 'input-container boolean-input';
    
    const currentValue = this.responses[question.id];
    
    // Yes button
    const yesButton = document.createElement('button');
    yesButton.type = 'button';
    yesButton.className = 'boolean-button yes-button';
    yesButton.textContent = 'Sim';
    yesButton.setAttribute('data-value', 'true');
    if (currentValue === true) {
      yesButton.classList.add('active');
    }
    yesButton.addEventListener('click', () => {
      this.handleBooleanResponse(question.id, true, yesButton.parentElement);
    });
    
    // No button
    const noButton = document.createElement('button');
    noButton.type = 'button';
    noButton.className = 'boolean-button no-button';
    noButton.textContent = 'Não';
    noButton.setAttribute('data-value', 'false');
    if (currentValue === false) {
      noButton.classList.add('active');
    }
    noButton.addEventListener('click', () => {
      this.handleBooleanResponse(question.id, false, noButton.parentElement);
    });
    
    container.appendChild(yesButton);
    container.appendChild(noButton);
    
    return container;
  }

  /**
   * Handles boolean response change
   * @param {string} questionId - Question ID
   * @param {boolean} value - Response value
   * @param {HTMLElement} container - Container element
   */
  handleBooleanResponse(questionId, value, container) {
    this.responses[questionId] = value;
    
    // Update button states
    const buttons = container.querySelectorAll('.boolean-button');
    buttons.forEach(btn => {
      btn.classList.remove('active');
      if ((value && btn.getAttribute('data-value') === 'true') ||
          (!value && btn.getAttribute('data-value') === 'false')) {
        btn.classList.add('active');
      }
    });
    
    this.handleResponseChange(questionId, value);
  }

  /**
   * Renders a text input
   * @param {Object} question - Question object
   * @returns {HTMLElement} Input element
   */
  renderTextInput(question) {
    const container = document.createElement('div');
    container.className = 'input-container text-input';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `question_${question.id}`;
    input.className = 'form-input';
    input.placeholder = question.placeholder || 'Digite sua resposta...';
    input.value = this.responses[question.id] || '';
    input.setAttribute('data-question-id', question.id);
    
    if (question.maxLength) {
      input.maxLength = question.maxLength;
    }
    
    input.addEventListener('input', (e) => {
      this.handleResponseChange(question.id, e.target.value);
    });
    
    input.addEventListener('blur', (e) => {
      this.validateQuestion(question);
    });
    
    container.appendChild(input);
    
    return container;
  }

  /**
   * Renders a number input
   * @param {Object} question - Question object
   * @returns {HTMLElement} Input element
   */
  renderNumberInput(question) {
    const container = document.createElement('div');
    container.className = 'input-container number-input';
    
    const input = document.createElement('input');
    input.type = 'number';
    input.id = `question_${question.id}`;
    input.className = 'form-input';
    input.placeholder = question.placeholder || 'Digite um número...';
    input.value = this.responses[question.id] || '';
    input.setAttribute('data-question-id', question.id);
    
    if (question.min !== undefined) {
      input.min = question.min;
    }
    if (question.max !== undefined) {
      input.max = question.max;
    }
    if (question.step !== undefined) {
      input.step = question.step;
    }
    
    input.addEventListener('input', (e) => {
      const value = e.target.value ? parseFloat(e.target.value) : '';
      this.handleResponseChange(question.id, value);
    });
    
    input.addEventListener('blur', (e) => {
      this.validateQuestion(question);
    });
    
    container.appendChild(input);
    
    return container;
  }

  /**
   * Renders a select (dropdown) input
   * @param {Object} question - Question object
   * @returns {HTMLElement} Input element
   */
  renderSelectInput(question) {
    const container = document.createElement('div');
    container.className = 'input-container select-input';
    
    const select = document.createElement('select');
    select.id = `question_${question.id}`;
    select.className = 'form-input';
    select.setAttribute('data-question-id', question.id);
    
    // Default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Selecione uma opção...';
    defaultOption.disabled = true;
    select.appendChild(defaultOption);
    
    // Add options
    if (question.options && Array.isArray(question.options)) {
      question.options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        if (this.responses[question.id] === option) {
          optionElement.selected = true;
        }
        select.appendChild(optionElement);
      });
    }
    
    select.addEventListener('change', (e) => {
      this.handleResponseChange(question.id, e.target.value);
    });
    
    select.addEventListener('blur', (e) => {
      this.validateQuestion(question);
    });
    
    container.appendChild(select);
    
    return container;
  }

  /**
   * Renders an exam status input (special select for exam status)
   * @param {Object} question - Question object
   * @returns {HTMLElement} Input element
   */
  renderExamStatusInput(question) {
    const container = document.createElement('div');
    container.className = 'input-container exam-status-input';
    
    const select = document.createElement('select');
    select.id = `question_${question.id}`;
    select.className = 'form-input exam-status-select';
    select.setAttribute('data-question-id', question.id);
    
    // Default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Selecione o status...';
    defaultOption.disabled = true;
    select.appendChild(defaultOption);
    
    // Exam status options
    const statusOptions = question.options || ['Não Realizado', 'Realizado', 'Resultado Disponível'];
    statusOptions.forEach(status => {
      const optionElement = document.createElement('option');
      optionElement.value = status;
      optionElement.textContent = status;
      
      // Add visual indicator
      if (status === 'Resultado Disponível') {
        optionElement.textContent = '✓ ' + status;
      } else if (status === 'Realizado') {
        optionElement.textContent = '◐ ' + status;
      } else if (status === 'Não Realizado') {
        optionElement.textContent = '✗ ' + status;
      }
      
      if (this.responses[question.id] === status) {
        optionElement.selected = true;
      }
      select.appendChild(optionElement);
    });
    
    select.addEventListener('change', (e) => {
      this.handleResponseChange(question.id, e.target.value);
    });
    
    select.addEventListener('blur', (e) => {
      this.validateQuestion(question);
    });
    
    container.appendChild(select);
    
    return container;
  }

  /**
   * Handles response change with debouncing and auto-save
   * @param {string} questionId - Question ID
   * @param {*} value - Response value
   */
  handleResponseChange(questionId, value) {
    this.responses[questionId] = value;
    
    // Clear previous validation error
    this.clearValidationError(questionId);
    
    // Call response change callback
    this.onResponseChange(questionId, value);
    
    // Auto-save with debouncing
    if (this.autoSave) {
      this.debounceAutoSave();
    }
  }

  /**
   * Debounced auto-save function
   * Saves responses after a delay to avoid excessive writes
   */
  debounceAutoSave() {
    if (this.debounceTimers.autoSave) {
      clearTimeout(this.debounceTimers.autoSave);
    }
    
    this.debounceTimers.autoSave = setTimeout(() => {
      this.saveState();
    }, this.debounceDelay);
  }

  /**
   * Immediately saves state without debouncing
   * Used when user explicitly submits or navigates away
   */
  saveStateImmediate() {
    if (this.debounceTimers.autoSave) {
      clearTimeout(this.debounceTimers.autoSave);
    }
    this.saveState();
  }

  /**
   * Validates a single question
   * @param {Object} question - Question object
   * @returns {boolean} True if valid
   */
  validateQuestion(question) {
    const value = this.responses[question.id];
    const errors = [];
    
    // Check required
    if (question.required && (value === null || value === undefined || value === '')) {
      errors.push(`${question.text} é obrigatório`);
    }
    
    // Type-specific validation
    if (value !== null && value !== undefined && value !== '') {
      switch (question.type) {
        case 'number':
          if (isNaN(value)) {
            errors.push('Deve ser um número válido');
          }
          if (question.min !== undefined && value < question.min) {
            errors.push(`Deve ser maior ou igual a ${question.min}`);
          }
          if (question.max !== undefined && value > question.max) {
            errors.push(`Deve ser menor ou igual a ${question.max}`);
          }
          break;
        
        case 'text':
          if (question.minLength && value.length < question.minLength) {
            errors.push(`Deve ter pelo menos ${question.minLength} caracteres`);
          }
          if (question.maxLength && value.length > question.maxLength) {
            errors.push(`Deve ter no máximo ${question.maxLength} caracteres`);
          }
          break;
        
        case 'select':
        case 'exam_status':
          if (question.options && !question.options.includes(value)) {
            errors.push('Opção inválida');
          }
          break;
      }
    }
    
    if (errors.length > 0) {
      this.setValidationError(question.id, errors[0]);
      return false;
    } else {
      this.clearValidationError(question.id);
      return true;
    }
  }

  /**
   * Validates all questions in the questionnaire
   * @returns {Object} Validation result with valid flag and errors
   */
  validateAll() {
    const errors = {};
    let isValid = true;
    
    this.questionnaire.sections.forEach(section => {
      section.questions.forEach(question => {
        if (!this.validateQuestion(question)) {
          isValid = false;
          errors[question.id] = this.validationErrors[question.id];
        }
      });
    });
    
    this.onValidationChange(isValid, errors);
    
    return {
      valid: isValid,
      errors
    };
  }

  /**
   * Sets validation error for a question
   * @param {string} questionId - Question ID
   * @param {string} errorMessage - Error message
   */
  setValidationError(questionId, errorMessage) {
    this.validationErrors[questionId] = errorMessage;
    
    const errorContainer = document.querySelector(
      `.error-message[data-question-id="${questionId}"]`
    );
    if (errorContainer) {
      errorContainer.textContent = errorMessage;
      errorContainer.style.display = 'block';
    }
    
    const questionWrapper = document.querySelector(
      `.question-wrapper[data-question-id="${questionId}"]`
    );
    if (questionWrapper) {
      questionWrapper.classList.add('error');
    }
  }

  /**
   * Clears validation error for a question
   * @param {string} questionId - Question ID
   */
  clearValidationError(questionId) {
    delete this.validationErrors[questionId];
    
    const errorContainer = document.querySelector(
      `.error-message[data-question-id="${questionId}"]`
    );
    if (errorContainer) {
      errorContainer.textContent = '';
      errorContainer.style.display = 'none';
    }
    
    const questionWrapper = document.querySelector(
      `.question-wrapper[data-question-id="${questionId}"]`
    );
    if (questionWrapper) {
      questionWrapper.classList.remove('error');
    }
  }

  /**
   * Gets all responses
   * @returns {Object} All responses
   */
  getResponses() {
    return { ...this.responses };
  }

  /**
   * Sets responses (for pre-filling)
   * @param {Object} responses - Responses to set
   */
  setResponses(responses) {
    this.responses = { ...responses };
    this.updateInputValues();
  }

  /**
   * Updates input values in the DOM
   */
  updateInputValues() {
    Object.entries(this.responses).forEach(([questionId, value]) => {
      const input = document.querySelector(`[data-question-id="${questionId}"]`);
      if (input) {
        if (input.type === 'checkbox' || input.type === 'radio') {
          input.checked = value;
        } else {
          input.value = value || '';
        }
      }
    });
  }

  /**
   * Saves current state to localStorage
   * Includes responses, timestamp, scroll position, and questionnaire metadata
   */
  saveState() {
    const state = {
      responses: this.responses,
      timestamp: Date.now(),
      scrollPosition: this.lastScrollPosition,
      questionnaireId: this.questionnaire?.id || 'unknown',
      questionnaireSections: this.questionnaire?.sections?.length || 0
    };
    
    const key = `${this.storagePrefix}state`;
    try {
      localStorage.setItem(key, JSON.stringify(state));
      console.log('✅ Questionnaire state saved to localStorage');
      return true;
    } catch (error) {
      console.error('Error saving questionnaire state:', error);
      // If localStorage is full, try to clear old data
      if (error.name === 'QuotaExceededError') {
        this.handleStorageQuotaExceeded();
      }
      return false;
    }
  }

  /**
   * Loads state from localStorage
   * @returns {Object|null} Saved state or null if not found or invalid
   */
  loadState() {
    const key = `${this.storagePrefix}state`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const state = JSON.parse(stored);
        console.log('✅ Questionnaire state loaded from localStorage');
        return state;
      }
    } catch (error) {
      console.error('Error loading questionnaire state:', error);
    }
    return null;
  }

  /**
   * Validates if a saved state is compatible with current questionnaire
   * @param {Object} state - Saved state to validate
   * @returns {boolean} True if state is valid and compatible
   */
  isStateValid(state) {
    if (!state || typeof state !== 'object') {
      return false;
    }

    // Check if state has required properties
    if (!state.responses || typeof state.responses !== 'object') {
      return false;
    }

    // Check if state is not too old (older than 24 hours)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (state.timestamp && Date.now() - state.timestamp > maxAge) {
      console.warn('⚠️ Saved state is older than 24 hours, discarding');
      return false;
    }

    return true;
  }

  /**
   * Recovers state from localStorage with validation
   * @returns {Object|null} Valid state or null
   */
  recoverState() {
    const state = this.loadState();
    
    if (!this.isStateValid(state)) {
      console.warn('⚠️ Saved state is invalid or expired');
      return null;
    }

    return state;
  }

  /**
   * Restores scroll position from saved state
   */
  restoreScrollPosition() {
    const state = this.recoverState();
    if (state && state.scrollPosition && this.scrollContainer) {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        this.scrollContainer.scrollTop = state.scrollPosition;
        this.lastScrollPosition = state.scrollPosition;
        console.log('✅ Scroll position restored');
      }, 0);
    }
  }

  /**
   * Handles localStorage quota exceeded error
   * Attempts to clear old data to make space
   */
  handleStorageQuotaExceeded() {
    console.warn('⚠️ localStorage quota exceeded, attempting cleanup');
    
    try {
      // Get all keys with this prefix
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.storagePrefix)) {
          keys.push(key);
        }
      }

      // Remove oldest states (keep only the most recent 3)
      if (keys.length > 3) {
        const keysToRemove = keys.slice(3);
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
          console.log(`🗑️ Removed old state: ${key}`);
        });
      }
    } catch (error) {
      console.error('Error handling storage quota exceeded:', error);
    }
  }

  /**
   * Clears saved state
   */
  clearState() {
    const key = `${this.storagePrefix}state`;
    try {
      localStorage.removeItem(key);
      console.log('✅ Questionnaire state cleared');
    } catch (error) {
      console.error('Error clearing questionnaire state:', error);
    }
  }

  /**
   * Sets up page unload handler to save state immediately
   * Ensures state is saved even if debounce timer hasn't fired
   */
  setupUnloadHandler() {
    // Remove previous handler if exists
    if (this.unloadHandler) {
      window.removeEventListener('beforeunload', this.unloadHandler);
    }

    // Create new handler
    this.unloadHandler = () => {
      this.saveStateImmediate();
    };

    // Add handler for page unload/navigation
    window.addEventListener('beforeunload', this.unloadHandler);
  }

  /**
   * Removes the unload handler
   */
  removeUnloadHandler() {
    if (this.unloadHandler) {
      window.removeEventListener('beforeunload', this.unloadHandler);
      this.unloadHandler = null;
    }
  }

  /**
   * Resets all responses
   */
  reset() {
    this.responses = {};
    this.validationErrors = {};
    this.updateInputValues();
    this.clearState();
    this.removeUnloadHandler();
  }

  /**
   * Scrolls to first error
   */
  scrollToFirstError() {
    const errorQuestionId = Object.keys(this.validationErrors)[0];
    if (errorQuestionId) {
      const errorElement = document.querySelector(
        `.question-wrapper[data-question-id="${errorQuestionId}"]`
      );
      if (errorElement && this.scrollContainer) {
        const offset = errorElement.offsetTop - this.scrollContainer.offsetTop;
        this.scrollContainer.scrollTop = offset - 100; // 100px padding
      }
    }
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QuestionnaireRenderer;
}
