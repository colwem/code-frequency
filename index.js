#!/usr/bin/env node

'use strict';
const Promise = require('bluebird'),
      exec = require('child-process-promise').exec,
      readFile = Promise.promisify(require('fs').readFile),
      argv = require('commander'),
      colors = require('colors'),
      stripAnsi = require('strip-ansi'),
      table = require('text-table'),
      assert = require('assert'),
      cpus = require('os').cpus;

argv
  .version(require('./package.json').version)
  .option('-f, --filetype <filetype>', 'Filetype argument to ag', '')
  .option('-d, --dir <dir>', 'Directory to search', '.')
  .option('-l, --list <list-file>', 'File with the list of words to search for')
  .parse(process.argv);

if(!process.argv.slice(2).length) {
  console.log(argv);
  argv.help();
}

if(! argv.list) {
  console.log('');
  console.log('  error: option `-l, --list <list-file>` is required');
  console.log('');
  process.exit(1);
}

argv.filetype && (argv.filetype = '--' + argv.filetype);

readFile(argv.list, 'utf8').then((contents) => {
  return contents.split("\n").filter(line => line !== '');
})

.map((word) => {
  const command = `ag ${argv.filetype} --vimgrep --stats -Q "${word}"`

  return exec(
      command,
      {cwd: argv.dir}
    ).then((result) => {

      return {
        word: word,
        count: parseInt(/^(\d+) matches/m.exec(result.stdout)[1]),
        lines: result.stdout.split("\n") }
    })
    .catch((err) => {

      return {
        word: word,
        count: 0,
        lines: []};
    });
},
{concurrency: cpus().length})

.then((matchObjects) => {

  matchObjects.sort((a, b) => {
    return a.count - b.count;
  }).reverse();

  const list = [[colors.cyan.bold.underline('Word'), colors.yellow.bold.underline('Count')]].concat(
    matchObjects.map((match) => {
      return [colors.cyan(match.word), colors.yellow(match.count)];
    }));

  const t = table(list, {
    align: ['l', 'r'],
    stringLength: str => stripAnsi(str).length
  });

  console.log(t);

});
