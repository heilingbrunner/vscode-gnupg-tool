/*!
 * node-gpg
 * Copyright(c) 2011 Nicholas Penree <drudge@conceited.net>
 * MIT Licensed
 * /
 
/*!
 * Transformed to typescript and modified
 */

/**
 * Module dependencies.
 */
import { readFile } from 'fs';
import { spawnGPG, streaming, cbfunc, options } from './spawnGPG';

/**
 * Raw call to gpg.
 *
 * @param  {String}   stdin  String to send to stdin.
 * @param  {Array}    [args] Array of arguments.
 * @param  {Function} [fn]   Callback.
 * @api public
 */
export function call(stdin: any,
  args: string[],
  cb?: cbfunc
): void {
  spawnGPG(stdin, [], args, cb);
}

/**
 * Raw streaming call to gpg. Reads from input file and writes to output file.
 *
 * @param  {String}   inputFileName  Name of input file.
 * @param  {String}   outputFileName Name of output file.
 * @param  {Array}    [args]         Array of arguments.
 * @param  {Function} [fn]           Callback.
 * @api public
 */
export function callStreaming(
  inputFileName: any,
  outputFileName: any,
  args: string[],
  cb: cbfunc
): void {
  streaming({ source: inputFileName, dest: outputFileName }, args, cb);
}

/**
 * Encrypt source file passed as `options.source` and store it in a file specified in `options.dest`.
 * @param {Object}   options  Should contain 'source' and 'dest' keys.
 * @param {Array}    [args]     additional args
 * @param {Function} [fn]     Callback.
 */
export function encryptToFile(
  options: options,
  args: string[],
  cb: cbfunc
): void {
  if (typeof args === 'function') {
    cb = args;
    args = [];
  }
  args = args.concat(['--encrypt']);
  streaming(options, args, cb);
}

/**
 * Encrypt source `file` and pass the encrypted contents to the callback `fn`.
 *
 * @param {String}   file   Filename.
 * @param {Function} [fn]   Callback containing the encrypted file contents.
 * @api public
 */
export function encryptFile(
  file: string | number | Buffer | import('url').URL,
  args: string[],
  cb: cbfunc
): void {
  readFile(file, function(err, content) {
    if (err) {
      return cb(err);
    }
    encrypt(content, args, cb);
  });
}

/**
 * Encrypt source stream passed as `options.source` and pass it to the stream specified in `options.dest`.
 * Is basicaly the same method as `encryptToFile()`.
 *
 * @param {Object}   options  Should contain 'source' and 'dest' keys that are streams.
 * @param {Array}    [args]     additional args
 * @param {Function} [fn]     Callback.
 * @api public
 */
export function encryptToStream(
  options: options,
  args: string[],
  cb: cbfunc
): void {
  args = args.concat(['--encrypt']);
  streaming(options, args, cb);
}

/**
 * Encrypt source `stream` and pass the encrypted contents to the callback `fn`.
 *
 * @param {ReadableStream} stream Stream to read from.
 * @param {Array}          [args] Optional additional arguments to pass to gpg.
 * @param {Function}       [fn]   Callback containing the encrypted file contents.
 * @api public
 */
export function encryptStream(
  stream: {
    on: {
      (arg0: string, arg1: (chunk: any) => void): void;
      (arg0: string, arg1: () => void): void;
      (arg0: string, arg1: any): void;
    };
  },
  args: string[],
  cb: cbfunc
) {
  let chunks: Uint8Array[] = [];

  stream.on('data', function(chunk) {
    chunks.push(chunk);
  });

  stream.on('end', function() {
    encrypt(Buffer.concat(chunks), args, cb);
  });

  stream.on('error', cb);
}

/**
 * Encrypt `str` and pass the encrypted version to the callback `fn`.
 *
 * @param {String|Buffer} str    String to encrypt.
 * @param {Array}         [args] Optional additional arguments to pass to gpg.
 * @param {Function}      [fn]   Callback containing the encrypted Buffer.
 * @api public
 */
export function encrypt(
  str: any,
  args: string[],
  cb: cbfunc
): void {
  spawnGPG(str, ['--encrypt'], args, cb);
}

/**
 * Decrypt `str` and pass the decrypted version to the callback `fn`.
 *
 * @param {String|Buffer} str    Data to decrypt.
 * @param {Array}         [args] Optional additional arguments to pass to gpg.
 * @param {Function}      [fn]   Callback containing the decrypted Buffer.
 * @api public
 */
export function decrypt(
  str: any,
  args: string[],
  cb: cbfunc
): void {
  spawnGPG(str, ['--decrypt'], args, cb);
}

/**
 * Decrypt source `file` and pass the decrypted contents to the callback `fn`.
 *
 * @param {String}   file Filename.
 * @param {Function} fn   Callback containing the decrypted file contents.
 * @api public
 */
export function decryptFile(
  file: string | number | Buffer | import('url').URL,
  args: string[],
  cb: cbfunc
): void {
  readFile(file, function(err, content) {
    if (err) {
      return cb(err);
    }
    decrypt(content, args, cb);
  });
}

  /**
   * Decrypt source file passed as `options.source` and store it in a file specified in `options.dest`.
   *
   * @param {Object}   options Should contain 'source' and 'dest' keys.
   * @param {Array}    [args]  Optional additional arguments to pass to gpg.
   * @param {Function} [fn]    Callback
   * @api public
   */
  export function decryptToFile(
    options: options,
    args: string[],
    cb: cbfunc
  ): void {
    args = args.concat(['--decrypt']);
    streaming(options, args, cb);
  }

/**
 * Decrypt source `stream` and pass the decrypted contents to the callback `fn`.
 *
 * @param {ReadableStream} stream Stream to read from.
 * @param {Array}          [args] Optional additional arguments to pass to gpg.
 * @param {Function}       [fn]   Callback containing the decrypted file contents.
 * @api public
 */
export function decryptStream(
  stream: {
    on: {
      (arg0: string, arg1: (chunk: any) => void): void;
      (arg0: string, arg1: () => void): void;
      (arg0: string, arg1: any): void;
    };
  },
  args: string[],
  cb: cbfunc
): void {
  let chunks: Uint8Array[] = [];

  stream.on('data', function(chunk: any) {
    chunks.push(chunk);
  });

  stream.on('end', function() {
    decrypt(Buffer.concat(chunks), args, cb);
  });

  stream.on('error', cb);
}

/**
 * Decrypt source stream passed as `options.source` and pass it to the stream specified in `options.dest`.
 * This is basicaly the same method as `decryptToFile()`.
 *
 * @param {Object}   options Should contain 'source' and 'dest' keys that are streams.
 * @param {Array}    [args]  Optional additional arguments to pass to gpg.
 * @param {Function} [fn]    Callback
 * @api public
 */
export function decryptToStream(
  options: options,
  args: string[],
  cb: cbfunc
): void {
  args = args.concat(['--decrypt']);
  streaming(options, args, cb);
}

  /**
   * Clearsign `str` and pass the signed message to the callback `fn`.
   *
   * @param {String|Buffer} str    String to clearsign.
   * @param {Array}         [args] Optional additional arguments to pass to gpg.
   * @param {Function}      [fn]   Callback containing the signed message Buffer.
   * @api public
   */
  export function clearsign(
    str: any,
    args: string[],
    cb?: cbfunc
  ): void {
    spawnGPG(str, ['--clearsign'], args, cb);
  }

  /**
   * Verify `str` and pass the output to the callback `fn`.
   *
   * @param {String|Buffer} str    Signature to verify.
   * @param {Array}         [args] Optional additional arguments to pass to gpg.
   * @param {Function}      [fn]   Callback containing the signed message Buffer.
   * @api public
   */
  export function verifySignature(
    str: any,
    args: string[],
    cb?: cbfunc
  ): void {
    // Set logger fd, verify otherwise outputs to stderr for whatever reason
    spawnGPG(str,  ['--logger-fd', '1', '--verify'], args, cb);
  }

/**
 * Add a key to the keychain by filename.
 *
 * @param {String}   fileName Key filename.
 * @param {Array}    [args]   Optional additional arguments to pass to gpg.
 * @param {Function} [fn]     Callback containing the signed message Buffer.
 * @api public
 */
export function importKeyFromFile(
  fileName: string | number | Buffer | import('url').URL,
  args: string[],
  cb: cbfunc
): void {
  if (typeof args === 'function') {
    cb = args;
    args = [];
  }

  readFile(fileName, function(readErr, str) {
    if (readErr) {
      return cb(readErr);
    }
    importKey(str, args, cb);
  });
}

/**
 * Add an ascii-armored key to gpg. Expects the key to be passed as input.
 *
 * @param {String}   keyStr Key string (armored).
 * @param {Array}    [args] Optional additional arguments to pass to gpg.
 * @param {Function} fn     Callback containing the signed message Buffer.
 * @api public
 */
export function importKey(
  keyStr: any,
  args: string[],
  cb: cbfunc
): void {
  if (typeof args === 'function') {
    cb = args;
    args = [];
  }

  // Set logger fd, verify otherwise outputs to stderr for whatever reason
  let defaultArgs = ['--logger-fd', '1', '--import'];

  spawnGPG(keyStr, defaultArgs, args, function(error?: Error, buffer?: Buffer):void {
    let result='';
    if (error) {
      // Ignorable errors
      if (/already in secret keyring/.test(error.message)) {
        result = error.message;
      } else {
        return cb(error);
      }
    }
    // Grab key fingerprint and send it back as second arg
    let match = buffer ? buffer.toString().match(/^gpg: key (.*?):/): '';
    let matchtxt = match;

    //TODO ...
    //cb(undefined, undefined, undefined, result + ' ' + match ? match[1]: '');
    cb(undefined, undefined, undefined, result + ' ' + (match ? match[1]:''));
  });
}

/**
 * Removes a key by fingerprint. Warning: this will remove both pub and privkeys!
 *
 * @param {String}   keyID  Key fingerprint.
 * @param {Array}    [args] Optional additional arguments to pass to gpg.
 * @param {Function} fn     Callback containing the signed message Buffer.
 * @api public
 */
export function removeKey(
  keyID: any,
  args: string[],
  cb?: cbfunc
): void {
  // Set logger fd, verify otherwise outputs to stderr for whatever reason
  spawnGPG(keyID, ['--logger-fd', '1', '--delete-secret-and-public-key'], args, cb);
}
