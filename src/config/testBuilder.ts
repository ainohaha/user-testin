/**
 * ============================================
 * TEST CONFIGURATION - EASY BLOCK-STYLE SETUP
 * ============================================
 * 
 * Edit this file to customize your usability test!
 * Each section below is a "block" you can modify.
 * 
 * HOW TO USE:
 * 1. Edit the testInfo section with your test details
 * 2. Customize screeningQuestions for participant filtering
 * 3. Define your tasks in the tasks array
 * 4. Adjust closingQuestions for final feedback
 * 
 * The app will automatically use these configurations.
 */

// ============================================
// BLOCK 1: TEST INFORMATION
// ============================================
export const testInfo = {
    title: "Usability Test",
    description: "Self-paced usability test",
    estimatedTime: "20 min",

    // Optional: Add your Figma/prototype embed URL
    // Leave empty if you don't have a prototype
    prototypeUrl: "",
};

// ============================================
// BLOCK 2: SCREENING QUESTIONS
// ============================================
// These questions appear before the test starts
// to filter or categorize participants.

export const screeningQuestions = [
    {
        id: "experience",
        question: "How familiar are you with this type of product?",
        type: "radio", // radio, checkbox, text, rating
        required: true,
        options: [
            "Expert - I use similar products daily",
            "Intermediate - I've used similar products before",
            "Beginner - I'm new to this type of product",
        ],
    },
    {
        id: "role",
        question: "Which best describes you?",
        type: "radio",
        required: true,
        options: [
            "Personal user",
            "Professional user",
            "Evaluating for others",
        ],
    },
    // ADD MORE SCREENING QUESTIONS HERE
    // Copy the block above and modify as needed
];

// ============================================  
// BLOCK 3: TASKS
// ============================================
// Each task is a goal for participants to complete.
// They'll interact with your prototype and answer questions.

export const tasks = [
    {
        id: 1,
        title: "Task 1",

        // The goal shown to participants
        scenario: "Complete the first goal in the prototype",

        // Icon options: ScanLine, LayoutGrid, DollarSign, Store, 
        // Package, Bell, CalendarClock, MapPin, CheckCircle2, Wallet
        icon: "ScanLine",

        // Questions asked after completing the task
        questions: {
            ease: "How easy was it to complete this task?",
            feedback: "What did you think about this task? Any hesitations or confusion?",
        },
    },
    {
        id: 2,
        title: "Task 2",
        scenario: "Complete the second goal in the prototype",
        icon: "LayoutGrid",
        questions: {
            ease: "How easy was it to complete this task?",
            feedback: "What did you think about this task? Any hesitations or confusion?",
        },
    },
    {
        id: 3,
        title: "Task 3",
        scenario: "Complete the third goal in the prototype",
        icon: "DollarSign",
        questions: {
            ease: "How easy was it to complete this task?",
            feedback: "What did you think about this task? Any hesitations or confusion?",
        },
    },
    // ADD MORE TASKS HERE
    // Copy any task block above and modify as needed
    // You can have as many tasks as you want!
];

// ============================================
// BLOCK 4: CLOSING QUESTIONS  
// ============================================
// These questions appear at the end of the test.

export const closingQuestions = [
    {
        id: "overall",
        question: "Overall, how would you rate your experience?",
        type: "rating",
        min: 1,
        max: 5,
        minLabel: "Very Poor",
        maxLabel: "Excellent",
    },
    {
        id: "recommend",
        question: "Would you recommend this product to others?",
        type: "radio",
        options: ["Yes", "Maybe", "No"],
    },
    {
        id: "feedback",
        question: "Any final thoughts or suggestions?",
        type: "textarea",
        placeholder: "Share your thoughts...",
    },
    // ADD MORE CLOSING QUESTIONS HERE
];

// ============================================
// BLOCK 5: FEATURE TOGGLES
// ============================================
// Enable or disable features

export const features = {
    // Show screen recording option
    screenRecording: true,

    // Show mic recording option  
    micRecording: true,

    // Enable AI-powered analysis (requires OpenAI key)
    aiAnalysis: true,

    // Show task completion status
    showProgress: true,
};
