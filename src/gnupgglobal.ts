import * as vscode from "vscode";
export class GnuPGGlobal {
  //  gpg
  //  [--homedir name]
  //  [--options file]
  //  [options]
  //  command
  //  [args]

  private static _available: boolean = false;
  private static _homedir: string | undefined;

  static set available(available: boolean){
    GnuPGGlobal._available = available;
  }

  static get available(): boolean {
    return  GnuPGGlobal._available;
  }

  static set homedir(path: string | undefined){
    GnuPGGlobal._homedir = path;
  }
  static get homedir(): string| undefined {
    return  GnuPGGlobal._homedir;
  }

  static get defaultargs(): string[] {
    let parameters: string[] = [];

    //default parameters ...
    parameters = parameters.concat(['--batch', '--yes']);

    if (GnuPGGlobal._homedir) {
      parameters = parameters.concat(['--homedir', GnuPGGlobal._homedir]);
    }

    return parameters;
  }
}
