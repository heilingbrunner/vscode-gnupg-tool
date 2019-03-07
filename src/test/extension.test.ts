//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';
import { promiseCheckVersion, promiseListPublicKeys, promiseListSecretKeys } from '../gnupgpromises';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as vscode from 'vscode';

// Defines a Mocha test suite to group tests of similar kind together
suite('Extension Tests', function() {
  test('promiseCheckVersion', async () => {
    const buff = await promiseCheckVersion();
    let version = buff.toString();
    assert.notEqual(version, '', 'No version');
  });

  test('promiseListPublicKeys', async () => {
    const buff = await promiseListPublicKeys();
    let keys = buff.toString();
    assert.notEqual(keys, '', 'No list');
  });
});
