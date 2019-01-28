class SagaCancelledError extends Error {
  constructor(...args: any[]) {
    super(...args);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SagaCancelledError);
    }
  }
}
