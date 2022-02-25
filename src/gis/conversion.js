const { geojsonToArcGIS, arcgisToGeoJSON } = require('@terraformer/arcgis')
const { wktToGeoJSON  } = require('@terraformer/wkt')
const turf = require('@turf/turf')
const constants = require('../utility/constants')

function convertWktToArc(inWkt, shapeType) {
    const geojson = wktToGeoJSON(inWkt)

    let adjustedJson = null
    switch (shapeType) {
        case constants.MULTIPOINT:
            const point = turf.multiPoint(geojson.coordinates)
            adjustedJson = turf.centroid(point).geometry
            break
        case constants.MULTILINE:
            const line = turf.lineString(geojson.coordinates[0])
            adjustedJson = line.geometry
            break
        case constants.MULTIPOLYGON:
            const poly = turf.multiPolygon(geojson.coordinates)
            adjustedJson = turf.union(poly, poly).geometry
            break
    
        default:
            break
    }

    const arcjson = geojsonToArcGIS(adjustedJson)
    arcjson.spatialReference.wkid = 3857 // Overwrite as web mercator
    
    return arcjson
}

function convertArcToGeoJson(inGeom) {
    return arcgisToGeoJSON(inGeom)
}

module.exports = {
    convertWktToArc: convertWktToArc,
    convertArcToGeoJson: convertArcToGeoJson,
}