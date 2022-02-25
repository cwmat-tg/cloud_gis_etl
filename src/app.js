const db = require('./db/postgres.js');
const agol = require('./gis/agol.js');
const terra = require('./gis/conversion.js');
const gis = require('./gis/analysis.js');
const coreLogic = require('./logic/core.js');
const helper = require('./utility/helper.js');
const constants = require('./utility/constants.js');

/* 
  Context is passed in from AWS Lambda and has info about the lambda function (ie name) 
*/
async function main(context) {

  /* 
    Setup config - Removed for the demo but keeping here to show how to unpack
    Demo config - would usually pull from a .env config file 
  */
  const CT_URL = 'https://cloud-gis-etl-default-rtdb.firebaseio.com/completedTreatments.json'
  const FEATURE_SERVICE = 'https://services.arcgis.com/4fG3YBzBoefRGq66/arcgis/rest/services/watersheds/FeatureServer/0'

  /* 
    Example of unpacking config from AWS SSM
  */
  // // Get and unpack
  // const paramsRaw = await helper.getParameter({Name: process.env.SSMPath, WithDecryption: true})
  // const params = JSON.parse(paramsRaw.Parameter.Value);

  // // Add unpacked config globally
  // global.appConfig = params;

  // // Can now access as normal via process.env
  // console.log(process.env.FEATURE_SERVICE)

  /* 
    Query DB to get completed treatments
  */
  console.log(`Getting data: ${constants.QUERY_CT}`)
  const ctJson = await db.fakeQuery(CT_URL)
  // helper.logThenQuit('Got DB Data', ctJson)

  /* 
    Delete routine removed to limit complexity.
    Used to be a segment here that would clear the AGOL feature layer if no feautres 
    were returned from the DB.
  */
  // Removed...

  /*
    Get AGOL features for Watersheds
  */
  const agolData = await agol.query(FEATURE_SERVICE)
  // helper.logThenQuit('Got AGOL Data', agolData)

  /* 
    Cycle through each feautre and get recordset of intersected CTs
  */
  let processedCTIds = []
  for await (let e of agolData) {
    console.log(`Processing Feature: ${e.attributes.OBJECTID}`)

    // Convert Esri JSON to GeoJSON - or just request GeoJSON from the REST endpoint
    const geoJsonGeom = terra.convertArcToGeoJson(e.geometry)
    // helper.log('geoJsonGeom', geoJsonGeom)

    // Convert GeoJSON to native Turf Object - in this case we are wokring with multi polys
    const turfGeom = gis.createTurfMultiPolygon(geoJsonGeom)
    // helper.logThenQuit('turfGeom', turfGeom)
    
    // Populate with default data
    e.attributes = coreLogic.getDefaultAttr({ ...e.attributes });
    // helper.logThenQuit('attributes', e.attributes)

    // Find intersecting completed treatments
    let intersectingCts = gis.getPolygonIntersect(turfGeom, ctJson, true)
    // intersectingCts = intersectingCts.filter(e => { return processedCTIds.indexOf(e.id) === -1}); // 
    if (intersectingCts?.length > 0) {
      // helper.log('Example of an Intersecting CT', intersectingCts)
      // Set base attributes based on intersection - queries fudnng data and maps to attributes
      const updateAttr = await coreLogic.unpackCts({ ...e.attributes }, intersectingCts)
      e.attributes = updateAttr.attributes
      // helper.logThenQuit('Attributes', updateAttr)
    }

    // Set funding data
    let primaryCts = gis.getPolygonIntersect(turfGeom, ctJson, true);
    // primaryCts = primaryCts.filter(e => { return processedCTIds.indexOf(e.id) === -1}); // 
    if (primaryCts?.length > 0) {
      // helper.log('Example of an Intersecting Primary CT', primaryCts)
      const updateCoreAttr = await coreLogic.unpackCoreCts({ ...e.attributes }, primaryCts)
      e.attributes = updateCoreAttr.attributes
      // helper.logThenQuit('Attributes', updateCoreAttr)
    }

    // Add processed IDs so they don't get counted again
    processedCTIds = processedCTIds.concat(intersectingCts.map((e) => e.id))
    processedCTIds = processedCTIds.concat(primaryCts.map((e) => e.id))
  }

  /* 
    Submit updates to the AGOL features
  */
  const chunkSize = 200;
  const maxDataLength = agolData.length
  if (maxDataLength <= chunkSize) {
      const updateResp = await agol.update(FEATURE_SERVICE, agolData)
      console.log('Update success')
  } else {
      let i,j, temporary, chunk = chunkSize;
      for (i = 0,j = agolData.length; i < j; i += chunk) {
          temporary = agolData.slice(i, i + chunk)
          let chunkUpdateResp = await agol.update(FEATURE_SERVICE, temporary)
          console.log(`Update success for chunk: ${i}`)
      }
  }
}

module.exports.run = async (event, context) => {
  const startTime = new Date()
  console.log(`Your cron function "${context?.functionName || ''}" started at ${startTime}`)

  try {
      await main(context)
  } catch (error) {
      if (error.name === 'NoDataError' && context)
        context.done()
      console.log(error.message)
  }

  const endTime = new Date()
  console.log(`Your cron function "${context?.functionName || ''}" ended at ${endTime}`)
}