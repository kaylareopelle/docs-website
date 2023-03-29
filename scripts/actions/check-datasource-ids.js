const { fetchNRGraphqlResults } = require('../utils/nr-graphql-helpers');
const { fetchPaginatedGHResults } = require('./utils/github-api-helpers');
const { getFileFrontmatter } = require('./utils/frontmatter-helpers')
const { getCommandLineOptions } = require('./utils/cli-options')
const path = require('path');
const { prop } = require('../utils/functional');
const { get } = require('lodash');

const DATASOURCE_ID_QUERY = `# gql
query DataSourceIdQuery {
  actor {
    nr1Catalog {
      search(filter: {types: DATA_SOURCE}) {
        results {
          ... on Nr1CatalogDataSource {
            id
          }
        }
      }
    }
  }
}
`;

const main = async () => {
  const options = getCommandLineOptions();
  const url = options.url || null;
  let mdxFileData;

  if (url) {
    const prFileData = await fetchPaginatedGHResults(
      url,
      process.env.GITHUB_TOKEN
    );

    mdxFileData = prFileData
      .filter((file) => path.extname(file.filename) === '.mdx')
      .filter((f) => f.status !== 'removed')
      .map(prop('filename'));

    const mdxFileFrontmatter = mdxFileData.map(getFileFrontmatter);
    const mdxFilesWithDatasources = mdxFileFrontmatter.filter(
      ({ dataSource }) => dataSource !== undefined
    );

    if (mdxFilesWithDatasources.length === 0) {
      return console.log('No files with data sources updated');
    }

    const { data } = await fetchNRGraphqlResults({
      queryString: DATASOURCE_ID_QUERY,
    });
    const ids = get(data, 'actor.nr1Catalog.search.results')?.map(
      ({ id }) => id
    );

    const invalidIds = mdxFilesWithDatasources.filter(({ dataSource }) => {
      const includesId = ids.includes(dataSource);

      return !includesId;
    });

    if (invalidIds.length === 0) {
      return console.log(`All ids match existing data sources`);
    }
    if (invalidIds.length > 0) {
      console.error(
        `ERROR: Found invalid dataSource ids in the following files`
      );
      invalidIds.forEach(({ dataSource, filename }) => {
        console.error(`- '${dataSource}' in ${filename}`);
      });
      console.error(`id should be one of existing unique dataSource ids`);
      process.exit(1);
    }
  }
  process.exit(0);
};

main();
