export class AppError extends Error {
  public code: string;
  public details?: unknown;

  constructor(message: string, code: string = 'unknown_error', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;

    // Set the prototype explicitly to ensure instanceof works correctly in TS/ES6
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Helps standardize third-party library errors (like Firebase) into AppError
   */
  static fromError(err: unknown, defaultMessage = 'An unexpected error occurred', overrideCode?: string): AppError {
    if (err instanceof AppError) return err;
    
    // Check if it's a Firebase Error (usually has a .code and .message)
    if (typeof err === 'object' && err !== null && 'code' in err && 'message' in err) {
      const fbErr = err as { code: string; message: string };
      return new AppError(fbErr.message, overrideCode || fbErr.code, err);
    }

    if (err instanceof Error) {
      return new AppError(err.message, overrideCode || 'internal_error', err);
    }

    return new AppError(defaultMessage, overrideCode || 'unknown_error', err);
  }
}
