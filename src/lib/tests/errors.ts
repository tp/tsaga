export class UnusedMockError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class TooManyAssertsError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class SagaTimeoutError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class NoActionError extends Error {
  constructor(message: string) {
    super(message);
  }
}