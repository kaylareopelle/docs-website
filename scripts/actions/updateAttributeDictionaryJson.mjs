#! /usr/bin/env node
import fetch from 'node-fetch';
import fs from 'fs';
import core from '@actions/core';

const NERDGRAPH_API_URL = 'https://staging-api.newrelic.com/graphql';
const JSON_FILE_PATH = 'src/data/attribute-dictionary.json';

const GQL_QUERY = `
  {
    docs {
      dataDictionary {
        events(names: "PageView") {
          name
          attributes {
            definition
            name
            units {
              label
            }
          }
        }
      }
    }
  }
`;

async function updateJson() {
  try {
    const updatedJson = await fetch(NERDGRAPH_API_URL, {
      method: 'POST',
      headers: {
        'Api-Key': process.env.API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: GQL_QUERY }),
    }).then((res) => res.json());

    const formattedJson = JSON.stringify(updatedJson, null, 2);
    console.log('Fetch successful!');

    const compareJson = fs.readFileSync(JSON_FILE_PATH, { encoding: 'utf-8' });

    const hasUpdates = compareJson != formattedJson;

    const message = hasUpdates
      ? 'Adding updates for attribute dictionary json'
      : 'No updates to attribute dictionary';

    core.setOutput('updateAttributeDictionary', hasUpdates);

    console.log(message);

    fs.writeFileSync(JSON_FILE_PATH, formattedJson);
  } catch (error) {
    console.error('Issue with fetching attribute dictionary:', error);
    process.exit(1);
  }
}

updateJson();
