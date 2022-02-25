const axios = require('axios')
const db = require('../db/postgres.js')
const helper = require('../utility/helper.js')
const constants = require('../utility/constants.js')

// Hard coded demo config - usually this would coem from an AWS SSM param
const PROJ_DATA_URL = 'https://cloud-gis-etl-default-rtdb.firebaseio.com/projectData.json'
const PROJ_FUND_URL = 'https://cloud-gis-etl-default-rtdb.firebaseio.com/projectFunding.json'

async function unpackCts(attributes, cts) {
  let ct_acres = 0
  let ct_count = cts?.length
  let ct_own = null
  let ct_type = null
  let ct_workagent = null
  let ct_lead_org = null
  let ct_partners = null

  let owners = []
  const types = []
  const partners = []
  let leadOrgs = []
  let projParts = []

  // Get partners - Note: Simple example for the demo, to actually query data vs requesting 
  // everything and then querying, see the Firebase JS SDK 
  // Docs: https://github.com/firebase/firebase-js-sdk
  const allProjData = await db.fakeQuery(PROJ_DATA_URL)
  for await (let e of cts) {
    ct_acres = ct_acres + e.properties?.acres
    types.push(e.properties?.fields?.activityType)
    partners.push(e.properties?.fields?.activityWorkAgent)
    // TODO get these data into firebase for the demo
    // const ownerData = await axios.post(process.env.STATS_URL, [e?.id])
    // const ownerKeys = Object.keys(ownerData?.data?.fields?.stats?.data?.ownership?.stats?.name || {})
    // owners = owners.concat(ownerKeys)

    const projData = allProjData.filter(x => x.activityid === e?.id)
    // helper.logThenQuit('Intersecting Projects', projData)

    // Unpack and populate lists containing partners and lead orgs
    const leadOrg = projData[0]?.fields?.leadOrganization
    leadOrgs.push(leadOrg)
    const projPartners = projData[0]?.fields?.Partners || []
    const projPartnerNames = projPartners.map(i => i?.name) || []
    projParts = projParts.concat(projPartnerNames)
    projParts.push(leadOrg)
  }

  // De dupe
  projParts = [...new Set(projParts)]
  leadOrgs = [...new Set(leadOrgs)]
  projParts = [...new Array(projParts)]
  leadOrgs = [...new Array(leadOrgs)]
  projParts = projParts.filter(x => x !== undefined)
  leadOrgs = leadOrgs.filter(x => x !== undefined)

  ct_own = owners.join(', ')
  ct_type = types.join(', ')
  ct_workagent = partners.join(', ')
  ct_lead_org = leadOrgs.join(', ')
  ct_partners = projParts.join(', ')


  attributes.ct_acres = ct_acres
  attributes.ct_count = ct_count
  attributes.ct_own = ct_own
  attributes.ct_type = ct_type
  attributes.ct_workagent = ct_workagent
  attributes.ct_lead_org = ct_lead_org
  attributes.ct_partners = ct_partners

  return { attributes: {...attributes} }
}

async function unpackCoreCts(attributes, cts) {
    let ct_fund_source = null
    let funds = []
    let overallFundingTable = []

    const allFundData = await db.fakeQuery(PROJ_FUND_URL)
    for await (let e of cts) {
        const fundData = allFundData.filter(x => x.activityid === e?.id)
        const fundKeys = fundData.map(i => i?.fields?.fundingOrg)
        funds = funds.concat(fundKeys)

        if (fundData.length > 0) {
            const addFund = fundData.map(i => {
                let planned = i?.fields?.plannedAmount
                let actual = i?.fields?.actualAmount

                if (planned)
                    planned = Number.parseFloat(planned)
                
                if (actual)
                    actual = Number.parseFloat(actual)

                return {
                    uid: attributes?.uid,
                    is_match: i?.fields?.match ? 'Yes' : 'No',
                    org: i?.fields?.fundingOrg,
                    planned: planned,
                    actual: actual
                }
            })
            overallFundingTable = overallFundingTable.concat(addFund)
        }
    }

    ct_fund_source = funds.join(', ')

    attributes.ct_fund_source = ct_fund_source

    // Aggregate and map the funding data
    attributes.fund_bia = getFundingSum(overallFundingTable, 'BIA')
    attributes.fund_blm = getFundingSum(overallFundingTable, 'BLM')
    attributes.fund_bor = getFundingSum(overallFundingTable, 'BOR')
    attributes.fund_fema = getFundingSum(overallFundingTable, 'FEMA')
    attributes.fund_nmassoc = getFundingSum(overallFundingTable, 'NM Association of Counties')
    attributes.fund_nmfinance = getFundingSum(overallFundingTable, 'NM Finance Authority')
    attributes.fund_nmdgf = getFundingSum(overallFundingTable, 'NMDGF')
    attributes.fund_nmfd = getFundingSum(overallFundingTable, 'NMFD')
    attributes.fund_nmusfs = getFundingSum(overallFundingTable, 'NMFD/USFS')
    attributes.fund_nmslo = getFundingSum(overallFundingTable, 'NMSLO')
    attributes.fund_nrcs = getFundingSum(overallFundingTable, 'NRCS')
    attributes.fund_nrcsusfs = getFundingSum(overallFundingTable, 'NRCS/USFS')
    attributes.fund_rockyelk = getFundingSum(overallFundingTable, 'Rocky Mountain Elk Foundation')
    attributes.fund_swcd = getFundingSum(overallFundingTable, 'SWCD')
    attributes.fund_tnc = getFundingSum(overallFundingTable, 'TNC')
    attributes.fund_tribepueblo = getFundingSum(overallFundingTable, 'Tribe or Pueblo')
    attributes.fund_usfs = getFundingSum(overallFundingTable, 'USFS')
    attributes.fund_wildturkey = getFundingSum(overallFundingTable, 'Wild Turkey Federation')
    attributes.fund_epanmed = getFundingSum(overallFundingTable, 'EPA/NMED')
    attributes.fund_nfwsnmdgf = getFundingSum(overallFundingTable, 'NFWS/NMDGF')
    attributes.fund_other = getFundingSum(overallFundingTable, 'Other Funds Not Mentioned')
    attributes.fund_private = getFundingSum(overallFundingTable, 'Private')
    attributes.fund_usfsnmfd = getFundingSum(overallFundingTable, 'USFS/NMFD')
    attributes.fund_ycc = getFundingSum(overallFundingTable, 'Youth Conservation Corps')

    attributes.fund_bia_match = getFundingSumMatch(overallFundingTable, 'BIA')
    attributes.fund_blm_match = getFundingSumMatch(overallFundingTable, 'BLM')
    attributes.fund_bor_match = getFundingSumMatch(overallFundingTable, 'BOR')
    attributes.fund_fema_match = getFundingSumMatch(overallFundingTable, 'FEMA')
    attributes.fund_nmassoc_match = getFundingSumMatch(overallFundingTable, 'NM Association of Counties')
    attributes.fund_nmfinance_match = getFundingSumMatch(overallFundingTable, 'NM Finance Authority')
    attributes.fund_nmdgf_match = getFundingSumMatch(overallFundingTable, 'NMDGF')
    attributes.fund_nmfd_match = getFundingSumMatch(overallFundingTable, 'NMFD')
    attributes.fund_nmusfs_match = getFundingSumMatch(overallFundingTable, 'NMFD/USFS')
    attributes.fund_nmslo_match = getFundingSumMatch(overallFundingTable, 'NMSLO')
    attributes.fund_nrcs_match = getFundingSumMatch(overallFundingTable, 'NRCS')
    attributes.fund_nrcsusfs_match = getFundingSumMatch(overallFundingTable, 'NRCS/USFS')
    attributes.fund_rockyelk_match = getFundingSumMatch(overallFundingTable, 'Rocky Mountain Elk Foundation')
    attributes.fund_swcd_match = getFundingSumMatch(overallFundingTable, 'SWCD')
    attributes.fund_tnc_match = getFundingSumMatch(overallFundingTable, 'TNC')
    attributes.fund_tribepueblo_match = getFundingSumMatch(overallFundingTable, 'Tribe or Pueblo')
    attributes.fund_usfs_match = getFundingSumMatch(overallFundingTable, 'USFS')
    attributes.fund_wildturkey_match = getFundingSumMatch(overallFundingTable, 'Wild Turkey Federation')
    attributes.fund_epanmed_match = getFundingSumMatch(overallFundingTable, 'EPA/NMED')
    attributes.fund_nfwsnmdgf_match = getFundingSumMatch(overallFundingTable, 'NFWS/NMDGF')
    attributes.fund_other_match = getFundingSumMatch(overallFundingTable, 'Other Funds Not Mentioned')
    attributes.fund_private_match = getFundingSumMatch(overallFundingTable, 'Private')
    attributes.fund_usfsnmfd_match = getFundingSumMatch(overallFundingTable, 'USFS/NMFD')
    attributes.fund_ycc_match = getFundingSumMatch(overallFundingTable, 'Youth Conservation Corps')

    const totalSum = getSumTotal({...attributes}, constants.FUNDING_FIELDS)
    const totalMatch = getSumTotal({...attributes}, constants.MATCH_FUNDING_FIELDS)

    attributes.ct_total_funding = totalSum
    attributes.ct_total_funding_match = totalMatch

    return { attributes: {...attributes} }
}

function getDefaultAttr(attributes) {
    attributes.ct_acres = 0
    attributes.ct_count = 0
    attributes.ct_own = null
    attributes.ct_type = null
    attributes.ct_partners = null
    attributes.ct_fund_source = null
    attributes.ct_lead_org = null
    attributes.ct_workagent = null
    
    // Funding
    attributes.fund_bia = null
    attributes.fund_blm = null
    attributes.fund_bor = null
    attributes.fund_fema = null
    attributes.fund_nmassoc = null
    attributes.fund_nmfinance = null
    attributes.fund_nmdgf = null
    attributes.fund_nmfd = null
    attributes.fund_nmusfs = null
    attributes.fund_nmslo = null
    attributes.fund_nrcs = null
    attributes.fund_nrcsusfs = null
    attributes.fund_rockyelk = null
    attributes.fund_swcd = null
    attributes.fund_tnc = null
    attributes.fund_tribepueblo = null
    attributes.fund_usfs = null
    attributes.fund_wildturkey = null
    attributes.fund_epanmed = null
    attributes.fund_nfwsnmdgf = null
    attributes.fund_other = null
    attributes.fund_private = null
    attributes.fund_usfsnmfd = null
    attributes.fund_ycc = null

    attributes.fund_bia_match = null
    attributes.fund_blm_match = null
    attributes.fund_bor_match = null
    attributes.fund_fema_match = null
    attributes.fund_nmassoc_match = null
    attributes.fund_nmfinance_match = null
    attributes.fund_nmdgf_match = null
    attributes.fund_nmfd_match = null
    attributes.fund_nmusfs_match = null
    attributes.fund_nmslo_match = null
    attributes.fund_nrcs_match = null
    attributes.fund_nrcsusfs_match = null
    attributes.fund_rockyelk_match = null
    attributes.fund_swcd_match = null
    attributes.fund_tnc_match = null
    attributes.fund_tribepueblo_match = null
    attributes.fund_usfs_match = null
    attributes.fund_wildturkey_match = null
    attributes.fund_epanmed_match = null
    attributes.fund_nfwsnmdgf_match = null
    attributes.fund_other_match = null
    attributes.fund_private_match = null
    attributes.fund_usfsnmfd_match = null
    attributes.fund_ycc_match = null

    attributes.ct_total_funding = 0
    attributes.ct_total_funding_match = 0

    attributes.lastmodified = Date.now()

    return { ...attributes }
}

function getSumTotal(inAttributes, valArray) {
    let sum = 0
    valArray.forEach(attrName => {
        const val = inAttributes?.[attrName]
        if (val)
            sum += val
    })

    return sum
}

function getFundingSum(inArray, org) {
    const filtered = inArray.filter(e => e.org === org)
    if (filtered && filtered.length > 0) {
        let sum = 0
        filtered.forEach(e => {
            if (e?.actual) {
                sum = sum + e.actual
            }
        })
        return sum
    } else {
        return null
    }
}

function getFundingSumMatch(inArray, org) {
    const filtered = inArray.filter(e => e.org === org && e.is_match === 'Yes')
    if (filtered && filtered.length > 0) {
        let sum = 0
        filtered.forEach(e => {
            if (e?.actual) {
                sum = sum + e.actual
            }
        })
        return sum
    } else {
        return null
    }
}


module.exports = {
    unpackCts: unpackCts,
    getDefaultAttr: getDefaultAttr,
    unpackCoreCts: unpackCoreCts,
}