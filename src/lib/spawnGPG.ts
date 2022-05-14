/*!
 * node-gpg
 * Copyright(c) 2011 Nicholas Penree <drudge@conceited.net>
 * MIT Licensed
 * /
 
/*!
 * Transformed to typescript and modified
 */

import { spawn } from 'child_process';
import { createReadStream, createWriteStream } from 'fs';

export type cbfunc = {
  (err?: Error, stdout?: Buffer, stderr?: Buffer, data?: string): void;
};

export type options = { source?: any; dest?: any };

/**
 * Wrapper around spawning GPG. Handles stdout, stderr, and default args.
 *
 * @param  {String}   stdin       Input string. Piped to stdin.
 * @param  {Array}    defaultArgs Default arguments for this task.
 * @param  {Array}    args        Arguments to pass to GPG when spawned.
 * @param  {Function} cb          Callback.
 */
export function spawnGPG(stdin: any, defaultArgs: any, args: string[], cb?: cbfunc) {
  cb = once(cb);

  var gpgArgs = (args || []).concat(defaultArgs);
  var buffer: any[] | Uint8Array[] = [];
  var bufferLength = 0;
  var data = '';
  var gpg = spawnIt(gpgArgs, cb);

  gpg.stdout.on('data', function (buff) {
    buffer.push(buff);
    bufferLength += buff.length;
  });

  gpg.stderr.on('data', function (buff) {
    data += buff.toString('utf8');
  });

  gpg.on('close', function (code) {
    if (cb) {
      var stdout = Buffer.concat(buffer, bufferLength);
      if (code !== 0) {
        // If error is empty, we probably redirected stderr to stdout (for verifySignature, import, etc)
        return cb(new Error(data || stdout.toString()));
      }

      //cb(err?: Error, stdout?: Buffer, stderr?: Buffer, data?: string): void;)
      cb(undefined, stdout, undefined, data);
    }
  });

  gpg.stdin.end(stdin);
}

/**
 * Similar to spawnGPG, but sets up a read/write pipe to/from a stream.
 *
 * @param  {Object}   options Options. Should have source and dest strings or streams.
 * @param  {Array}    args    GPG args.
 * @param  {Function} cb      Callback
 */
export function streaming(options: options, args: any, cb: cbfunc) {
  cb = once(cb);
  options = options || {};

  var isSourceStream = isStream(options.source);
  var isDestStream = isStream(options.dest);

  if (typeof options.source !== 'string' && !isSourceStream) {
    return cb(new Error("Missing 'source' option (string or stream)"));
  } else if (typeof options.dest !== 'string' && !isDestStream) {
    return cb(new Error("Missing 'dest' option (string or stream)"));
  }

  var sourceStream;
  if (!isSourceStream) {
    // This will throw if the file doesn't exist
    try {
      sourceStream = createReadStream(options.source);
    } catch (e) {
      let msg
      if (e instanceof Error) msg = e.message
      else msg = String(e)
      
      return cb(new Error(options.source + ' does not exist. Error: ' + msg));
    }
  } else {
    sourceStream = options.source;
  }

  var destStream;
  if (!isDestStream) {
    try {
      destStream = createWriteStream(options.dest);
    } catch (e) {
      let msg
      if (e instanceof Error) msg = e.message
      else msg = String(e)

      return cb(new Error('Error opening ' + options.dest + '. Error: ' + msg));
    }
  } else {
    destStream = options.dest;
  }

  // Go for it
  var gpg = spawnIt(args, cb);

  if (!isDestStream) {
    gpg.on('close', function (code) {
      cb(undefined);
    });
  } else {
    cb(undefined, destStream);
  }

  // Pipe input file into gpg stdin; gpg stdout into output file..
  sourceStream.pipe(gpg.stdin);
  gpg.stdout.pipe(destStream);
}

// Wrapper around spawn. Catches error events and passed global args.
function spawnIt(args: string[], cb: cbfunc) {
  var gpg = spawn('gpg', args || []);
  gpg.on('error', cb);
  return gpg;
}

// Ensures a callback is only ever called once.
function once(cb?: cbfunc) {
  var called = false;
  return function () {
    if (called) {
      return;
    }
    called = true;
    if (cb) {
      let err = arguments[0];
      let stdout = arguments[1];
      let stderr = arguments[2];
      let data = arguments[3];
      cb(err, stdout, stderr, data);
    }
  };
}

// Check if input is stream with duck typing
function isStream(stream: { pipe: any } | null) {
  return stream !== null && typeof stream === 'object' && typeof stream.pipe === 'function';
}
