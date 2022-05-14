# How to create & minimize VSIX package

## Minimize VSIX

- use .vscodeignore to exclude files and folders

## Select bundler

Edit package.json to select a bundler (webpack: `prepublish-with-webpack` or esbuild: `prepublish-with-esbuild`).

package.json:

```json
    "scripts": {
        "vscode:prepublish": "npm run prepublish-with-esbuild", <-- edit here
        "prepublish-with-webpack": "webpack --mode production",
        "prepublish-with-esbuild": "npm run esbuild-base -- --minify",
        ...
    }
```  
## Create VSIX

- run `vsce package` in root folder
