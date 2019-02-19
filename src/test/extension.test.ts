//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';
import { promise_checkVersion } from '../gnupgpromises';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as vscode from 'vscode';
// import * as myExtension from '../extension';

// Defines a Mocha test suite to group tests of similar kind together
suite('Extension Tests', function() {


  test('WarmUp Test A', function() {
    let a = 'A';
    assert.equal(a, 'A','Not A');
  });

  test('promise_checkVersion', function() {
    promise_checkVersion().then(buff => {
      const v = buff.toString();
      assert.equal(v, 'A','Not A');
    });
  });

});
