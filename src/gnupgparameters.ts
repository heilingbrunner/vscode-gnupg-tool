import * as vscode from "vscode";
export class GnuPGParameters {
  //  gpg
  //  [--homedir name]
  //  [--options file]
  //  [options]
  //  command
  //  [args]

  private static _available: boolean = false;
  private static _homedir: string | undefined;

  static set available(available: boolean){
    GnuPGParameters._available = available;
  }

  static get available(): boolean {
    return  GnuPGParameters._available;
  }

  static set homedir(path: string | undefined){
    GnuPGParameters._homedir = path;
  }
  static get homedir(): string| undefined {
    return  GnuPGParameters._homedir;
  }

  static get defaultargs(): string[] {
    let parameters: string[] = [];

    //default parameters ...
    parameters = parameters.concat(['--batch', '--yes']);

    if (GnuPGParameters._homedir) {
      parameters = parameters.concat(['--homedir', GnuPGParameters._homedir]);
    }

    return parameters;
  }
}
