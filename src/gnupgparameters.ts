export class GnuPGParameters {
  //  gpg
  //  [--homedir name]
  //  [--options file]
  //  [options]
  //  command
  //  [args]
  private static _homedir: string | undefined;

  static set homedir(path: string | undefined){
    GnuPGParameters._homedir = path;
  }
  static get homedir(): string| undefined {
    return  GnuPGParameters._homedir;
  }

  static get defaultargs(): string[] {
    let parameters: string[] = [];

    //default parameters ...
    parameters = parameters.concat(['--batch']);

    if (GnuPGParameters._homedir) {
      parameters = parameters.concat(['--homedir', GnuPGParameters._homedir]);
    }

    return parameters;
  }
}
