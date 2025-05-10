// jest.setup.js

// --- JSDOM Setup & Global Window Mocks ---
// JSDOM provides a `window` and `document`, but sometimes you need to extend it.
// If you have functions assigned directly to window in index.html or script.js,
// you might need to mock them or parts of them here.

// Example: Mock `localStorage` (Jest's JSDOM has a basic one, but this is more explicit)
const localStorageMock = (() => {
    let store = {};
    return {
      getItem: (key) => store[key] || null,
      setItem: (key, value) => { store[key] = value.toString(); },
      removeItem: (key) => { delete store[key]; },
      clear: () => { store = {}; },
    };
  })();
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  
  // Mock `window.scrollTo` if your UI code uses it
  window.scrollTo = jest.fn();
  
  // Mock `alert`, `confirm`, `prompt`
  window.alert = jest.fn();
  window.confirm = jest.fn(() => true); // Default to true for confirm
  window.prompt = jest.fn(() => null); // Default to null (cancel) for prompt
  
  // Mock `URL.createObjectURL` and `URL.revokeObjectURL`
  window.URL.createObjectURL = jest.fn(() => 'blob:http://localhost/mock-url');
  window.URL.revokeObjectURL = jest.fn();
  
  // Basic Mock for `fetch` (can be overridden per test or use jest-fetch-mock)
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve('Mocked fetch text response'),
      json: () => Promise.resolve({ mock: 'data' }),
      headers: new Headers(), // Provide a basic Headers object
    })
  );
  
  // --- Mock External Libraries Loaded via CDN (Critical for UI tests) ---
  // These need to be mocked because JSDOM won't execute external scripts.
  window.MathJax = {
    typesetPromise: jest.fn(() => Promise.resolve()),
    startup: {
      promise: Promise.resolve(),
      document: {
        clearMathItemsWithin: jest.fn(),
      },
    },
    // Add other MathJax properties/methods your code might access
    tex: {},
    svg: {},
    loader: {load: jest.fn()}
  };
  window.resolveMathJaxReady = jest.fn(); // If `utils.js` expects this
  
  window.YT = {
    Player: jest.fn().mockImplementation((elementId, config) => {
      // Simulate the onReady event if a callback is provided
      if (config && config.events && config.events.onReady) {
        setTimeout(() => config.events.onReady({ target: { /* mock player instance */ } }), 0);
      }
      return {
        destroy: jest.fn(),
        getDuration: jest.fn(() => 0), // Mock actual player methods
        getCurrentTime: jest.fn(() => 0),
        seekTo: jest.fn(),
        playVideo: jest.fn(),
        pauseVideo: jest.fn(),
        // ... other methods used by your code
      };
    }),
    PlayerState: {
      ENDED: 0,
      PLAYING: 1,
      PAUSED: 2,
      BUFFERING: 3,
      CUED: 5,
    },
  };
  window.ytApiLoadingInitiated = false; // For `loadYouTubeAPI` in `ui_course_study_material.js`
  window.onYouTubeIframeAPIReady = jest.fn();
  
  window.pdfjsLib = {
    getDocument: jest.fn().mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: jest.fn().mockResolvedValue({
          getViewport: jest.fn(() => ({ width: 600, height: 800, scale: 1 })),
          render: jest.fn(() => ({ promise: Promise.resolve() })),
          getTextContent: jest.fn(() => Promise.resolve({ items: [] })),
        }),
      }),
    }),
    GlobalWorkerOptions: { workerSrc: '' },
  };
  
  window.Cropper = jest.fn().mockImplementation(() => ({
    getCroppedCanvas: jest.fn(() => document.createElement('canvas')), // Return a mock canvas
    destroy: jest.fn(),
  }));
  
  window.Chart = jest.fn().mockImplementation((context, config) => ({
    destroy: jest.fn(),
    update: jest.fn(),
    config: config, // Store config for assertions if needed
    data: config.data,
  }));
  // Chart.register is called in the modules, make it a NOP for tests if not testing Chart.js itself
  window.Chart.register = jest.fn();
  
  
  window.html2pdf = jest.fn().mockReturnValue({
    set: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    save: jest.fn().mockResolvedValue(undefined), // Mock the save function
  });
  
  window.jspdf = {
      jsPDF: jest.fn().mockImplementation(() => ({
          addImage: jest.fn(),
          save: jest.fn(),
      })),
  };
  
  
  // --- Mock Firebase (Crucial for most tests) ---
  // This provides a baseline mock. You can override specific methods in your tests.
  const mockFirestoreDate = new Date(); // For consistent timestamps
  global.firebase = {
    initializeApp: jest.fn(),
    auth: jest.fn(() => ({
      currentUser: null, // Start as logged out
      onAuthStateChanged: jest.fn((callback) => {
        // Simulate initial auth state
        setTimeout(() => callback(global.firebase.auth().currentUser), 0);
        return jest.fn(); // Unsubscribe function
      }),
      signInWithEmailAndPassword: jest.fn().mockResolvedValue({ user: { uid: 'test-uid', email: 'test@example.com', displayName: 'Test User' } }),
      createUserWithEmailAndPassword: jest.fn().mockResolvedValue({ user: { uid: 'new-uid', email: 'new@example.com', displayName: 'New User' } }),
      signInWithPopup: jest.fn().mockResolvedValue({ user: { uid: 'google-uid', email: 'google@example.com', displayName: 'Google User' } }),
      signOut: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      // Mock updateProfile for user profile updates
      updateProfile: jest.fn().mockResolvedValue(undefined),
    })),
    firestore: jest.fn(() => ({
      collection: jest.fn().mockImplementation(collectionPath => {
        // Basic mock for collection().doc().get()
        const mockDoc = {
          get: jest.fn().mockResolvedValue({ exists: false, data: () => undefined, id: 'mockDocId' }),
          set: jest.fn().mockResolvedValue(undefined),
          update: jest.fn().mockResolvedValue(undefined),
          delete: jest.fn().mockResolvedValue(undefined),
          onSnapshot: jest.fn((callback) => {
            setTimeout(() => callback({ docs: [], empty: true, docChanges: () => [] }), 0);
            return jest.fn(); // unsubscribe
          }),
          collection: jest.fn().mockReturnThis(), // For subcollections, chain back
          add: jest.fn().mockResolvedValue({ id: 'newMockDocId' })
        };
        const mockCollection = {
          doc: jest.fn(() => mockDoc),
          add: jest.fn().mockResolvedValue({ id: 'newMockDocId' }),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ empty: true, docs: [], forEach: jest.fn(), size: 0 }),
          onSnapshot: jest.fn((callback) => {
            setTimeout(() => callback({ docs: [], empty: true, docChanges: () => [] }), 0);
            return jest.fn(); // unsubscribe
          }),
        };
        return mockCollection;
      }),
      doc: jest.fn().mockImplementation(path => ({ // For db.doc('path/to/doc')
          get: jest.fn().mockResolvedValue({ exists: false, data: () => undefined, id: path.split('/').pop() }),
          set: jest.fn().mockResolvedValue(undefined),
          update: jest.fn().mockResolvedValue(undefined),
          delete: jest.fn().mockResolvedValue(undefined),
          collection: jest.fn().mockReturnThis(), // For subcollections
          onSnapshot: jest.fn((callback) => {
            setTimeout(() => callback({ exists: false, data: () => undefined }), 0);
            return jest.fn(); // unsubscribe
          }),
      })),
      batch: jest.fn(() => ({
          set: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          commit: jest.fn().mockResolvedValue(undefined),
      })),
      runTransaction: jest.fn(async (updateFunction) => {
          // Simulate transaction, actual transaction logic is complex to mock fully
          const mockTransaction = {
              get: jest.fn().mockResolvedValue({ exists: false, data: () => undefined }),
              set: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
          };
          await updateFunction(mockTransaction);
          return Promise.resolve();
      }),
      FieldValue: {
        serverTimestamp: jest.fn(() => mockFirestoreDate),
        arrayUnion: jest.fn(elements => ({ _methodName: 'FieldValue.arrayUnion', _elements: elements })),
        arrayRemove: jest.fn(elements => ({ _methodName: 'FieldValue.arrayRemove', _elements: elements })),
        delete: jest.fn(() => ({ _methodName: 'FieldValue.delete' })),
        increment: jest.fn(n => ({ _methodName: 'FieldValue.increment', _operand: n })),
      },
    })),
    apps: [{ name: '[DEFAULT]' }], // Simulate that Firebase is initialized
    app: jest.fn(() => ({
      name: '[DEFAULT]'
    }))
  };
  
  // Mock `state.js` module (important for modules that import from state.js)
  // This mock will apply to all tests unless overridden locally.
  jest.mock('./state.js', () => {
      const originalState = jest.requireActual('./state.js');
      return {
          ...originalState, // Spread original exports
          auth: global.firebase.auth(), // Override with mock
          db: global.firebase.firestore(),   // Override with mock
          // Default mock values for other state variables
          currentUser: null,
          currentSubject: null,
          data: { subjects: {} }, // Start with empty subjects
          userCourseProgressMap: new Map(),
          globalCourseDataMap: new Map(),
          activeCourseId: null,
          charts: {},
          videoDurationMap: {},
          userAiChatSettings: {
              primaryModel: 'mock-primary-model',
              fallbackModel: 'mock-fallback-model',
              customSystemPrompts: {}
          },
          globalAiSystemPrompts: {},
          // Mock setter functions
          setAuth: jest.fn((newAuth) => originalState.auth = newAuth), // Allow actual setting for testing if needed
          setDb: jest.fn((newDb) => originalState.db = newDb),
          setData: jest.fn((newData) => originalState.data = newData),
          setCurrentUser: jest.fn((newUser) => originalState.currentUser = newUser),
          setCurrentSubject: jest.fn((newSubject) => originalState.currentSubject = newSubject),
          setCharts: jest.fn((newCharts) => originalState.charts = newCharts),
          setUserCourseProgressMap: jest.fn((newMap) => originalState.userCourseProgressMap = newMap),
          setGlobalCourseDataMap: jest.fn((newMap) => originalState.globalCourseDataMap = newMap),
          setActiveCourseId: jest.fn((newId) => originalState.activeCourseId = newId),
          setUserAiChatSettings: jest.fn((newSettings) => originalState.userAiChatSettings = newSettings),
          setGlobalAiSystemPrompts: jest.fn((newPrompts) => originalState.globalAiSystemPrompts = newPrompts),
      };
  });