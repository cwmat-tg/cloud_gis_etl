const AWS = require('aws-sdk')
AWS.config.update({ region: 'us-east-1' })
const ssm = new AWS.SSM()

// Convert a PG DB Set to an AGOL field attribute obj
function recordSetToAgolAttr(dbSet) {
  const attributes = {}
  for (let propName in fieldsCrosswalk) {
      if (propName in dbSet) {
        attributes[fieldsCrosswalk[propName]] = dbSet[propName]
      }
  }

  return attributes
}

// Get SSM param from AWS
function getParameter(param) {
  return new Promise(function (success, reject) {
    ssm.getParameter(param, function (err, data) {
      if (err) {
        reject(err)
      } else {
        success(data)
      }
    })
  })
}

// Unpack PG connection string
function unpackConnectionString(inString) {
  const parts = inString.split('')
  return {
    PGHOST: parts[0].split('=')[1] || null,
    PGPORT: parts[1].split('=')[1] || null,
    PGDATABASE: parts[2].split('=')[1] || null,
    PGUSER: parts[3].split('=')[1] || null,
    PGPASSWORD: parts[4].split('=')[1] || null,
  }
}

// Generic console logging - quit after
function logThenQuit(message, data) {
  console.log(`${message}:`);
  console.log(data);
  process.exit(1)
}

// Generic console logging
function log(message, data) {
  console.log(`${message}:`);
  console.log(data);
}

module.exports = {
  recordSetToAgolAttr: recordSetToAgolAttr,
  getParameter: getParameter,
  unpackConnectionString: unpackConnectionString,
  logThenQuit: logThenQuit,
  log: log,
}