import * as vscode from 'vscode';

export default class DecryptedContentProvider implements vscode.TextDocumentContentProvider {
    
    private static s_instance?: DecryptedContentProvider = undefined;
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

    constructor() {
        if(DecryptedContentProvider.s_instance) {
            DecryptedContentProvider.s_instance.dispose();
        }
        DecryptedContentProvider.s_instance = this;
    }

    static get instance() {
        return DecryptedContentProvider.s_instance;
    }

    public dispose() {
        this._onDidChange.dispose();
        if(DecryptedContentProvider.s_instance) {
            DecryptedContentProvider.s_instance.dispose();
            DecryptedContentProvider.s_instance = undefined;
        }
    }

    public provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
        return new Promise( async (resolve) => {
            let proceed = 'Open';
            if (proceed === 'Open') {
                //TODO: decrypt content ....

                let content = 'decrypted ...';
                return resolve(content);
            } else {
                return resolve('(decryption cancelled.)');
            }
        });
    }
    
    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }
    
    public update(uri: vscode.Uri) {
        this._onDidChange.fire(uri);
    }

}