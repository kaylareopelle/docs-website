const { Command } = require('commander');

const getCommandLineOptions = () => {
  // Sets up commander to use input arguments for this scripts from the CLI or GitHub Actions - CM
  const program = new Command();
  program.option('-u, --url <url>', 'url to PR of file changes');
  program.parse(process.argv);
  return program.opts();
};

module.exports = { getCommandLineOptions };
