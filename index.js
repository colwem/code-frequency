'use strict';
const Promise = require('bluebird');
const exec = require('child-process-promise').exec;
const readFile = Promise.promisify(require('fs').readFile);
const argv = require('minimist')(process.argv.slice(2));

const words = readFile(argv.list, 'utf8').then((contents) => {
  let tmp = contents.split("\n")
  let tmp2 = tmp.filter((line) => line !== '');
  return tmp2;
});

const wordCounts = words.map(
  (word) => {
    const count = exec(
        `ag --vim --vimgrep --stats -Q "${word}" | grep "^\\d\\+ matches"`,
        {cwd: argv.dir}
      ).then((result) => {

        return parseInt(/\d+/.exec(result.stdout)[0]);
      })
      .catch((err) => {
        console.log(err);
        return 0;
      });

    const lines = exec(
        `ag --vim --vimgrep -Q "${word}"`,
        {cwd: argv.dir}
      ).then((result) => {

        return result.stdout;
      })
      .catch((err) => {
        console.log(err);

        return '';
      });

    return Promise.join(count, lines,
      (count, lines) => {

        return {word, count, lines};
      });

  },
  {concurrency: 10});

Promise.all(wordCounts).then((matches) => {

  matches.sort((a, b) => {
    return a.count - b.count;
  }).reverse();

  matches.forEach((match) => {
    console.log(`word: ${match.word} count: ${match.count}`);
  });

})

