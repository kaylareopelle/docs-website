const fs = require('fs');
const frontmatter = require('@github-docs/frontmatter');
const path = require('path');

const getFileFrontmatter = (mdxFile) => {
  const contents = fs.readFileSync(path.join(process.cwd(), mdxFile));
  const { data } = frontmatter(contents);

  return { ...data, filename: mdxFile };
};

module.exports = { getFileFrontmatter };
