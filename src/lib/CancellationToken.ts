export class CancellationToken {
  // tslint:disable-next-line:variable-name // TODO: better this way, should change rule setting
  private _canceled = false;

  public cancel() {
    console.error(`cancelling via token`);
    this._canceled = true;
  }

  public get canceled() {
    return this._canceled;
  }
}
