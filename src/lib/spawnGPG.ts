import { spawn } from 'child_process';
var globalArgs = ['--batch'];
import { createReadStream as readStream } from 'fs';
import { createWriteStream as writeStream } from 'fs';
import { call } from './gpg';

// export type cbfuncn = {
//   (): void;
//   (err: Error): void;
//   (arg0: null): void;
//   (arg0: null, arg1: any): void;
//   (arg0: any, arg1: any): void;
//   (err: { stack: string }, stdout: Buffer): void;
//   (arg0: null, arg1: Buffer, arg2: string): void;
// };

export type cbfunc = {
  (): void;
  //(err: { stack?: string } | Error | undefined): void;
  //(err: { stack?: string } | Error | undefined, buffer: any): void;
  //(err: { stack?: string } | Error | undefined, buffer: Buffer, result: string): void;
  (err?: Error, buffer?: Buffer, stderr?: Buffer, result?: string): void;
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
  // Allow calling with (input, defaults, cb)
  // if (typeof args === 'function') {
  //   cb = args;
  //   args = [];
  // }

  cb = once(cb);

  var gpgArgs = (args || []).concat(defaultArgs);
  var buffers: any[] | Uint8Array[] = [];
  var buffersLength = 0;
  var error = '';
  var gpg = spawnIt(gpgArgs, cb);

  gpg.stdout.on('data', function(buf) {
    buffers.push(buf);
    buffersLength += buf.length;
  });

  gpg.stderr.on('data', function(buf) {
    error += buf.toString('utf8');
  });

  gpg.on('close', function(code) {
    if (cb) {
      var msg = Buffer.concat(buffers, buffersLength);
      if (code !== 0) {
        // If error is empty, we probably redirected stderr to stdout (for verifySignature, import, etc)
        return cb(new Error(error || msg.toString()));
      }

      //TODO ...
      cb(undefined, undefined, undefined, msg + ' ' + error);
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
      sourceStream = readStream(options.source);
    } catch (e) {
      return cb(new Error(options.source + ' does not exist. Error: ' + e.message));
    }
  } else {
    sourceStream = options.source;
  }

  var destStream;
  if (!isDestStream) {
    try {
      destStream = writeStream(options.dest);
    } catch (e) {
      return cb(new Error('Error opening ' + options.dest + '. Error: ' + e.message));
    }
  } else {
    destStream = options.dest;
  }

  // Go for it
  var gpg = spawnIt(args, cb);

  if (!isDestStream) {
    gpg.on('close', function(code) {
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
  var gpg = spawn('gpg', globalArgs.concat(args || []));
  gpg.on('error', cb);
  return gpg;
}

// Ensures a callback is only ever called once.
function once(cb?: cbfunc) {
  var called = false;
  return function() {
    if (called) {
      return;
    }
    called = true;
    if (cb) {
      cb.apply(arguments);
    }
  };
}

// Check if input is stream with duck typing
function isStream(stream: { pipe: any } | null) {
  return stream !== null && typeof stream === 'object' && typeof stream.pipe === 'function';
}
