const { fetchPaginatedGHResults } = require('./utils/github-api-helpers');
const { getCommandLineOptions } = require('./utils/cli-options');
const { getFileFrontmatter } = require('./utils/frontmatter-helpers')
const path = require('path');
const { prop } = require('../utils/functional');

const getFilenames = ((obj, arr) => obj.forEach(o => arr.push(o['filename'])))
const filterFilenames = ((big, lil) => big.filter(x => !lil.includes(x)))

const findMissingFiles = (lilGroup, bigGroup) => {
  let lil = []
  let big = []

  getFilenames(lilGroup, lil)
  getFilenames(bigGroup, big)

  return filterFilenames(big, lil)
}

const logMissingFields = (subset, fullset, type) => {
  let messages = []
  let code = 0
  messages.push(`Checking for missing ${type} fields...`)
  if(subset.length !== fullset.length) {
    const missingFiles = findMissingFiles(subset, fullset)
    messages.push(`ERROR: ${type} front matter field not present in the following files`)
    missingFiles.forEach(filename => messages.push(`- ${filename}`));
    messages.push(`Please add '${type}: []' to the front matter on these files.`)
    code = 1
  } else {
    messages.push(`PASS: Metadata fields for ${type} found in all changed agent release notes!`)
    code = 0
  }
  return [code, messages.join(`\n`)]
}

const main = async () => {
  const options = getCommandLineOptions();
  const url = options.url || null;
  let mdxFileData;
  let exitCode = 0;
  let messages = []
  let prFileData = null

  if (url) {
    prFileData = await fetchPaginatedGHResults(
      url,
      process.env.GITHUB_TOKEN
    );
  } else {
    console.error('No URL. Exiting.')
    process.exit(1)
  }

  mdxFileData = prFileData
    .filter((file) => path.extname(file.filename) === '.mdx')
    .filter((file) => file.filename.match(/.*\/release-notes\/agent-release-notes\/.*/))
    .filter((f) => f.status !== 'removed')
    .map(prop('filename'));

  const mdxFileFrontmatter = mdxFileData.map(getFileFrontmatter);

  const mdxFilesWithSecurity = mdxFileFrontmatter.filter(
    ({ security }) => security !== undefined
  );

  const mdxFilesWithFeatures = mdxFileFrontmatter.filter(
    ({ features }) => features !== undefined
  );

  const mdxFilesWithBugs = mdxFileFrontmatter.filter(
    ({ bugs }) => bugs !== undefined
  );

  const securityResult = logMissingFields(mdxFilesWithSecurity, mdxFileFrontmatter, 'security')
  const featuresResult = logMissingFields(mdxFilesWithFeatures, mdxFileFrontmatter, 'features')
  const bugsResult = logMissingFields(mdxFilesWithBugs, mdxFileFrontmatter, 'bugs')

  securityResult[0] > 0 ? exitCode = securityResult : exitCode
  featuresResult[0] > 0 ? exitCode = featuresResult : exitCode
  bugsResult[0] > 0 ? exitCode = bugsResult : exitCode

  messages.push(securityResult[1])
  messages.push(featuresResult[1])
  messages.push(bugsResult[1])
  console.log(messages)

  const missingFiles = []

  mdxFileFrontmatter.filter(
  	({ features, bugs, security, filename }) => {
    	let entries = []

      entries.push(features)
      entries.push(bugs)
      entries.push(security)

      const flat = entries.flat()
      if(!flat.some(element => typeof element === 'string')) {
      	missingFiles.push(filename)
      }
  } )

  console.log(`Checking for files without any front matter entries...`)

  if(missingFiles.length > 0) {
    exitCode = 1
    console.error(`ERROR: front matter entry not present in the following files`)
    missingFiles.forEach(filename => console.error(`- ${filename}`));
    console.error(`Please add at least one string entry to the 'features', 'bugs', or 'security' front matter arrays.`)
  } else {
    console.log(`PASS: All scanned release notes have at least one entry!`)
  }

  process.exit(exitCode);
};

main();

module.exports = { main }
