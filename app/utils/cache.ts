/**
 * Cache utility for storing intervention plans, diagnoses, and questionnaires
 * with 6-month expiration
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheStats {
  totalItems: number;
  expiredItems: number;
  size: string;
}

// Cache configuration
const CACHE_PREFIX = 'stuckapp_cache_';
const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months in milliseconds
const CACHE_VERSION = '1.0';

// Cache keys
export const CACHE_KEYS = {
  INTERVENTION_PLANS: 'intervention_plans',
  ASSESSMENT: 'assessment',
  QUESTIONNAIRE: 'questionnaire',
  USER_ANSWERS: 'user_answers',
} as const;

/**
 * Generate a cache key with prefix and version
 */
function getCacheKey(key: string): string {
  return `${CACHE_PREFIX}${CACHE_VERSION}_${key}`;
}

/**
 * Get current timestamp
 */
function getCurrentTimestamp(): number {
  return Date.now();
}

/**
 * Check if cache item is expired
 */
function isExpired(item: CacheItem<any>): boolean {
  return getCurrentTimestamp() > item.expiresAt;
}

/**
 * Save data to cache with expiration
 */
export function setCacheItem<T>(key: string, data: T, customTTL?: number): void {
  try {
    const cacheKey = getCacheKey(key);
    const timestamp = getCurrentTimestamp();
    const expiresAt = timestamp + (customTTL || SIX_MONTHS_MS);
    
    const cacheItem: CacheItem<T> = {
      data,
      timestamp,
      expiresAt,
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
  } catch (error) {
    console.warn(`Failed to cache item ${key}:`, error);
  }
}

/**
 * Get data from cache if not expired
 */
export function getCacheItem<T>(key: string): T | null {
  try {
    const cacheKey = getCacheKey(key);
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) {
      return null;
    }
    
    const cacheItem: CacheItem<T> = JSON.parse(cached);
    
    if (isExpired(cacheItem)) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return cacheItem.data;
  } catch (error) {
    console.warn(`Failed to retrieve cached item ${key}:`, error);
    return null;
  }
}

/**
 * Remove specific cache item
 */
export function removeCacheItem(key: string): void {
  try {
    const cacheKey = getCacheKey(key);
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.warn(`Failed to remove cached item ${key}:`, error);
  }
}

/**
 * Clear all cache items
 */
export function clearCache(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
}

/**
 * Clean up expired cache items
 */
export function cleanupExpiredCache(): number {
  let cleanedCount = 0;
  
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const cacheItem = JSON.parse(cached);
            if (isExpired(cacheItem)) {
              localStorage.removeItem(key);
              cleanedCount++;
            }
          }
        } catch {
          // Remove malformed cache items
          localStorage.removeItem(key);
          cleanedCount++;
        }
      }
    });
  } catch (error) {
    console.warn('Failed to cleanup expired cache:', error);
  }
  
  return cleanedCount;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
  let totalItems = 0;
  let expiredItems = 0;
  let totalSize = 0;
  
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        totalItems++;
        const item = localStorage.getItem(key);
        if (item) {
          totalSize += item.length;
          
          try {
            const cacheItem = JSON.parse(item);
            if (isExpired(cacheItem)) {
              expiredItems++;
            }
          } catch {
            expiredItems++;
          }
        }
      }
    });
  } catch (error) {
    console.warn('Failed to get cache stats:', error);
  }
  
  return {
    totalItems,
    expiredItems,
    size: `${(totalSize / 1024).toFixed(2)} KB`,
  };
}

/**
 * Cache intervention plans for a specific stuck type
 */
export function cacheInterventionPlans(stuckType: string, plans: string[]): void {
  const key = `${CACHE_KEYS.INTERVENTION_PLANS}_${stuckType}`;
  setCacheItem(key, plans);
}

/**
 * Get cached intervention plans for a specific stuck type
 */
export function getCachedInterventionPlans(stuckType: string): string[] | null {
  const key = `${CACHE_KEYS.INTERVENTION_PLANS}_${stuckType}`;
  return getCacheItem<string[]>(key);
}

/**
 * Cache assessment result
 */
export function cacheAssessment(answers: any, assessment: any): void {
  // Create a hash of answers for the key
  const answersHash = btoa(JSON.stringify(answers)).substring(0, 20);
  const key = `${CACHE_KEYS.ASSESSMENT}_${answersHash}`;
  setCacheItem(key, assessment);
}

/**
 * Get cached assessment for specific answers
 */
export function getCachedAssessment(answers: any): any | null {
  const answersHash = btoa(JSON.stringify(answers)).substring(0, 20);
  const key = `${CACHE_KEYS.ASSESSMENT}_${answersHash}`;
  return getCacheItem(key);
}

/**
 * Cache questionnaire responses
 */
export function cacheQuestionnaire(sessionId: string, answers: any): void {
  const key = `${CACHE_KEYS.QUESTIONNAIRE}_${sessionId}`;
  setCacheItem(key, answers);
}

/**
 * Get cached questionnaire responses
 */
export function getCachedQuestionnaire(sessionId: string): any | null {
  const key = `${CACHE_KEYS.QUESTIONNAIRE}_${sessionId}`;
  return getCacheItem(key);
}


/**
 * Initialize cache system - cleanup expired items on app start
 */
export function initializeCache(): void {
  cleanupExpiredCache();
  
  // Schedule cleanup every hour
  setInterval(() => {
    cleanupExpiredCache();
  }, 60 * 60 * 1000);
}
