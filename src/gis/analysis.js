const helpers = require('@turf/helpers')
const turf = require('@turf/turf')

function getPolygonIntersect(inGeom, targetFeatureColletion, centroid = false) {
    const intersects = []
    let errorCount = 0

    targetFeatureColletion.features.forEach(e => {
        try {
            let targetGeom = createTurfMultiPolygon(e.geometry)
            let ogGeom = { ...targetGeom }
            if (centroid) {
                targetGeom = centerOfMassMultiPolygon(targetGeom)
            }

            let intersectGeom
            if (centroid) {
                intersectGeom = booleanPointInMultiPolygon(inGeom, targetGeom)
                if (!intersectGeom) {
                    // If center of mass doesn't intersect, do one final check to see if at least any touch
                    intersectGeom = turf.intersect(inGeom, ogGeom)
                }
            } else {
                intersectGeom = turf.intersect(inGeom, targetGeom)
            }

            if (intersectGeom && !centroid) {
                e.properties.intersectArea = turf.area(intersectGeom)
                intersects.push(e)
            } else if (intersectGeom && centroid) {
                intersects.push(e)
            }
        } catch (error) {
            errorCount += 1
        }
    })

    console.log(`Error Count: ${errorCount}`)

    return intersects
}

function createTurfMultiPolygon(inGeoJson) {
    return helpers.multiPolygon(inGeoJson.coordinates)
}

function pointInMultiPolygon(pt, mp) {
    return mp.geometry.coordinates.some(e => {
        return turf.booleanPointInPolygon(pt, turf.polygon(e))
    })
}

function booleanPointInMultiPolygon(inGeom, targetGeom) {
    if (inGeom.geometry.coordinates?.length > 1) {
        try {
            // Sometimes turf breaks up large polygon coord arrays so check here first
            return turf.booleanPointInPolygon(targetGeom,  turf.polygon(inGeom.geometry.coordinates))
        } catch (error) {
            // Is actual multipoolygon
        for (let index = 0; index < inGeom.geometry.coordinates.length; index++) {
            const element = inGeom.geometry.coordinates[index]
            const check = turf.booleanPointInPolygon(targetGeom,  turf.polygon(element))
            if (check)
                return true
        }

        return false
        }
    } else {
        // Is not multi or is invalid
        return turf.booleanPointInPolygon(targetGeom,  turf.polygon(inGeom.geometry.coordinates))
    }
}

function centerOfMassMultiPolygon(targetGeom) {
    if (targetGeom.geometry.coordinates?.length > 1) {
        try {
            // Sometimes turf break up large polygon coord arrays so check here first
            return turf.centerOfMass(turf.polygon(targetGeom.geometry.coordinates))
        } catch (error) {
            // Is actual multipoolygon
            let mainIndex
            let highestArea = 0
            for (let index = 0; index < targetGeom.geometry.coordinates.length; index++) {
                const element = targetGeom.geometry.coordinates[index]
                const area = turf.area(turf.polygon(element))
                if (area > highestArea) {
                    highestArea = area
                    mainIndex = index
                }
            }

        return turf.centerOfMass(turf.polygon(targetGeom.geometry.coordinates[mainIndex]))
        }
    } else {
        // Is not multi or is invalid
        return turf.centerOfMass(turf.polygon(targetGeom.geometry.coordinates))
    }
}

module.exports = {
    getPolygonIntersect: getPolygonIntersect,
    createTurfMultiPolygon: createTurfMultiPolygon
}