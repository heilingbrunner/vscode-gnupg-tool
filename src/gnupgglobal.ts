import * as vscode from "vscode";
export class GnuPGGlobal {
  //  gpg
  //  [--homedir name]
  //  [--options file]
  //  [options]
  //  command
  //  [args]

  private static _available: boolean = false;
  private static _homedir?: string;
  private static _version?: string;

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

  static set version(version: string| undefined){
    GnuPGGlobal._version = version;
  }
  static get version(): string| undefined {
    return  GnuPGGlobal._version;
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
