"use strict";
/**
 * Type definitions for the hybrid embedding + Gemini diagnostic model
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIAGNOSTIC_QUESTION_IDS = exports.DISTORTION_TYPES = exports.EMOTIONS = exports.STUCK_TYPES = void 0;
// ============================================
// CORE STUCK TYPES
// ============================================
exports.STUCK_TYPES = [
    "confusion",
    "ambiguity",
    "fear",
    "overwhelm",
    "exhaustion",
    "perfection_loop",
];
// ============================================
// EMOTIONS
// ============================================
exports.EMOTIONS = [
    "anxious",
    "numb",
    "frustrated",
    "scared",
    "overwhelmed",
    "guilty",
];
// ============================================
// DISTORTION TYPES
// ============================================
exports.DISTORTION_TYPES = [
    "catastrophizing",
    "allOrNothing",
    "mindReading",
    "shouldStatements",
    "overgeneralization",
];
// ============================================
// DIAGNOSTIC QUESTIONS
// ============================================
exports.DIAGNOSTIC_QUESTION_IDS = [
    "internalVoice",
    "eightyPercentThought",
    "whyBestWork",
    "avoidanceDuration",
    "helpSeeking",
];
