export class CancellationToken {
  private canceled = false;

  public cancel() {
    this.canceled = true;
  }

  public isCanceled() {
    return this.canceled;
  }
}