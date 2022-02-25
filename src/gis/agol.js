require('cross-fetch/polyfill')
require('isomorphic-form-data')
const { request } = require('@esri/arcgis-rest-request')
const { ApplicationSession} = require('@esri/arcgis-rest-auth')
const { addFeatures, updateFeatures, queryFeatures, deleteFeatures, getAttachments, addAttachment } = require('@esri/arcgis-rest-feature-layer')

async function queryMetadata(serviceUrl) {
    const authentication = getAuth()
    
    const resp = await request(serviceUrl, {
        authentication,
    })

    return resp
}

async function query(serviceUrl, queryString) {
    if (!queryString) {
        queryString = '1=1'
    }
    const authentication = getAuth()
    
    const resp = await queryFeatures({
        url: serviceUrl,
        where: queryString,
        maxRecordCount: 5000,
        authentication,
    })

    return resp.features
}

async function queryFields(serviceUrl, fields, queryString) {
    if (!fields) {
        fields = '*'
    }
    if (!queryString) {
        queryString = '1=1'
    }
    const authentication = getAuth()
    
    let resp = await queryFeatures({
        url: serviceUrl,
        where: queryString,
        outFields: fields,
        returnGeometry: false,
        httpMethod: 'POST',
        authentication,
    })
    features = resp.features
    while (resp.exceededTransferLimit) {
        resp = await queryFeatures({
            url: serviceUrl,
            where: queryString,
            outFields: fields,
            returnGeometry: false,
            httpMethod: 'POST',
            authentication,
            resultOffset: features.length,
        })
        features.push(...resp.features)
    }

    return features
}

async function add(serviceUrl, featureArray) {
    const authentication = getAuth()

    let resp
    try {
        resp = await addFeatures({
            url: serviceUrl,
            features: featureArray,
            authentication,
        })
    } catch (err) {
        resp = err
    }

    return resp
}

async function update(serviceUrl, featureArray) {
    const authentication = getAuth()

    let resp
    try {
        resp = await updateFeatures({
            url: serviceUrl,
            features: featureArray,
            authentication,
        })
    } catch (err) {
        resp = err
    }

    return resp
}

async function remove(serviceUrl, oidArray) {
    const authentication = getAuth()

    let resp
    try {
        resp = await deleteFeatures({
            url: serviceUrl,
            objectIds: oidArray,
            authentication,
        })
    } catch (err) {
        resp = err
    }

    return resp
}

async function getFeatureAttachments(serviceUrl, uid) {
    const authentication = getAuth()

    let resp
    try {
        resp = await getAttachments({
            url: serviceUrl,
            featureId: uid,
            authentication,
        })
    } catch (err) {
        resp = err
    }

    return resp
}

async function addFeatureAttachments(serviceUrl, uid, attachmentData) {
    const authentication = getAuth()

    let resp
    try {
        resp = await addAttachment({
            url: serviceUrl,
            featureId: uid,
            attachment: attachmentData,
            authentication,
        })
    } catch (err) {
        resp = err
    }

    return resp
}

function getAuth() {
    const authentication = new ApplicationSession({
        clientId: process.env['APP_ID'],
        clientSecret: process.env['APP_SECRET'],
    })

    return authentication
}

module.exports = {
    queryMetadata: queryMetadata,
    query: query,
    add: add,
    update: update,
    getFeatureAttachments: getFeatureAttachments,
    addFeatureAttachments: addFeatureAttachments,
    remove: remove,
    queryFields: queryFields,
}