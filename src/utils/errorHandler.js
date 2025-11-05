/**
 * Converts Firebase error codes to user-friendly error messages
 * @param {Error} error - The Firebase error object
 * @returns {string} - User-friendly error message
 */
export function getErrorMessage(error) {
  // If error is already a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // If error doesn't have a code, try to extract message
  if (!error.code && error.message) {
    // Check if it's a Firebase error message format
    const firebaseErrorMatch = error.message.match(/Firebase: Error \((.+)\)/);
    if (firebaseErrorMatch) {
      return getErrorMessageFromCode(firebaseErrorMatch[1]);
    }
    return error.message;
  }

  // Handle Firebase Auth errors
  if (error.code) {
    return getErrorMessageFromCode(error.code);
  }

  // Default fallback
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Maps Firebase error codes to user-friendly messages
 * @param {string} code - Firebase error code
 * @returns {string} - User-friendly error message
 */
function getErrorMessageFromCode(code) {
  const errorMessages = {
    // Authentication errors
    'auth/invalid-credential': 'Invalid email or password. Please check your credentials and try again.',
    'auth/invalid-email': 'The email address is not valid. Please check and try again.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    'auth/user-not-found': 'No account found with this email address. Please sign up first.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/email-already-in-use': 'An account with this email already exists. Please sign in instead.',
    'auth/weak-password': 'Password is too weak. Please use at least 6 characters.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your internet connection and try again.',
    'auth/invalid-verification-code': 'Invalid verification code. Please try again.',
    'auth/invalid-verification-id': 'Invalid verification ID. Please try again.',
    'auth/missing-email': 'Email address is required.',
    'auth/missing-password': 'Password is required.',
    'auth/invalid-phone-number': 'Invalid phone number format.',
    'auth/credential-already-in-use': 'This credential is already associated with another account.',
    'auth/requires-recent-login': 'Please sign out and sign in again to complete this action.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
    'auth/cancelled-popup-request': 'Only one sign-in request can be active at a time.',
    'auth/popup-blocked': 'Popup was blocked by browser. Please allow popups and try again.',
    'auth/account-exists-with-different-credential': 'An account already exists with the same email but different sign-in method.',
    
    // Firestore errors
    'permission-denied': 'You do not have permission to perform this action.',
    'unauthenticated': 'You must be signed in to perform this action.',
    'not-found': 'The requested item was not found.',
    'already-exists': 'This item already exists.',
    'failed-precondition': 'The operation was rejected. Please try again.',
    'unavailable': 'Service is temporarily unavailable. Please try again later.',
    'deadline-exceeded': 'The operation timed out. Please try again.',
    'internal': 'An internal error occurred. Please try again later.',
    'unimplemented': 'This feature is not yet available.',
    'invalid-argument': 'Invalid input provided. Please check your data and try again.',
    'resource-exhausted': 'Service quota exceeded. Please try again later.',
    'out-of-range': 'Operation is out of valid range.',
    'aborted': 'The operation was aborted. Please try again.',
    'data-loss': 'Data was lost during the operation. Please try again.',
    'unknown': 'An unknown error occurred. Please try again.',
    
    // Network errors
    'unavailable': 'Unable to connect to the server. Please check your internet connection.',
  };

  // Return the mapped message or a generic one
  return errorMessages[code] || `An error occurred: ${code}. Please try again.`;
}

/**
 * Gets a user-friendly error message for Firestore operations
 * @param {Error} error - The Firestore error object
 * @param {string} operation - The operation being performed (add, update, delete, fetch)
 * @returns {string} - User-friendly error message
 */
export function getFirestoreErrorMessage(error, operation = 'perform this action') {
  const operationMessages = {
    add: 'add this transaction',
    update: 'update this transaction',
    delete: 'delete this transaction',
    fetch: 'load your transactions',
  };

  const action = operationMessages[operation] || operation;
  
  if (error.code === 'permission-denied') {
    return 'You do not have permission to ' + action + '. Please sign in again.';
  }
  
  if (error.code === 'unauthenticated') {
    return 'You must be signed in to ' + action + '. Please sign in and try again.';
  }
  
  if (error.code === 'not-found' || error.code === 'NOT_FOUND') {
    return 'The requested data was not found. This might be because the collection is empty or the item was deleted.';
  }
  
  if (error.code === 'unavailable' || error.message?.includes('network')) {
    return 'Unable to ' + action + ' due to network issues. Please check your connection and try again.';
  }
  
  return getErrorMessage(error);
}

