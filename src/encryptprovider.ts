import * as vscode from 'vscode';
import * as fs from 'fs';
import { encrypt } from 'gpg';

export default class EncryptProvider implements vscode.TextDocumentContentProvider {

    private static s_instance?: EncryptProvider = undefined;
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

    constructor() {
        if (EncryptProvider.s_instance) {
            EncryptProvider.s_instance.dispose();
        }
        EncryptProvider.s_instance = this;
    }

    static get instance() {
        return EncryptProvider.s_instance;
    }

    public dispose() {
        this._onDidChange.dispose();
        if (EncryptProvider.s_instance) {
            EncryptProvider.s_instance.dispose();
            EncryptProvider.s_instance = undefined;
        }
    }

    public provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
        return new Promise(async (resolve, reject) => {
            let check = 'ok';
            if (check === 'ok') {
                //TODO: decrypt content ....
                //const filepath = getPhysicalPath(uri);

                let content = this.getContent(uri);
                let args = ['--armor'];

                encrypt(content, args, (err: string, result: string) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result.toString());
                    }
                });
            } else {
                return resolve('(encryption cancelled.)');
            }
        });
    }

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

    public update(uri: vscode.Uri) {
        this._onDidChange.fire(uri);
    }

    getContent(uri: vscode.Uri): string {

        let filepath = '';
        let buffer: Buffer | undefined;

        if (uri.scheme === 'gpg-encrypt') {
            // remove the pseudo '.asc' extension, create new uri
            filepath = uri.with({ scheme: 'file' }).fsPath.slice(0, -('.asc'.length));
            buffer = fs.readFileSync(filepath);
        }

        return (buffer !== undefined) ? buffer.toString() : '';
    }

}