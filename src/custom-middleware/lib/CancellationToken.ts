export class CancellationToken {
  private _canceled = false;

  public cancel() {
    console.error(`cancelling via token`);
    this._canceled = true;
  }

  public get canceled() {
    return this._canceled;
  }
}
