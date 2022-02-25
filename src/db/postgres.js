const { Client } = require('pg')
const axios = require('axios');

// Send a query to a Postgres DB and await the response.
// Specific env vars need to be added to the caller of this function.
// See docs for https://www.npmjs.com/package/pg for more info.
async function query(sqlQuery) {
  const client = new Client()
  await client.connect()
  
  try {
    const res = await client.query(sqlQuery)
    return res;
  } catch (error) {
    console.log(error);
    return;
  } finally {
    await client.end()
  }
}

// Using this for the demo to simualte the PG query
// Hits a temp firebase realtime database API
async function fakeQuery(endpoint) {
  const resp = await axios.get(endpoint)
  return resp?.data || null
}

module.exports = {
  query: query,
  fakeQuery: fakeQuery,
};