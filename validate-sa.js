#!/usr/bin/env node

const { argv } = require('yargs')
  .usage('Usage: ./$0 folder-id\nfolder-id Does SA has read Pemission to the directory ID you want to detect')
  .help('h')
  .alias('h', 'help')

const fs = require('fs')
const path = require('path')
const prompts = require('prompts')
const { GoogleToken } = require('gtoken')
const axios = require('@viegg/axios')
const HttpsProxyAgent = require('https-proxy-agent')

const { https_proxy } = process.env
const axins = axios.create(https_proxy ? { httpsAgent: new HttpsProxyAgent(https_proxy) } : {})

const SA_FILES = fs.readdirSync(path.join(__dirname, 'sa')).filter(v => v.endsWith('.json'))
const SA_TOKENS = SA_FILES.map(filename => {
  const gtoken = new GoogleToken({
    keyFile: path.join(__dirname, 'sa', filename),
    scope: ['https://www.googleapis.com/auth/drive']
  })
  return {gtoken, filename}
})

main()
async function main () {
  const [fid] = argv._
  if (validate_fid(fid)) {
    console.log('Start testing', SA_TOKENS.length, 'SA accounts')
    const invalid_sa = await get_invalid_sa(SA_TOKENS, fid)
    if (!invalid_sa.length) return console.log('Detected', SA_TOKENS.length, 'Individual SA，No invalid account detected')
    const choice = await choose(invalid_sa.length)
    if (choice === 'yes') {
      mv_sa(invalid_sa)
      console.log('Successfully moved')
    } else {
      console.log('Successful exit, invalid SA record：', invalid_sa)
    }
  } else {
    console.warn('Folder ID is missing or malformed')
  }
}

function mv_sa (arr) {
  for (const filename of arr) {
    const oldpath = path.join(__dirname, 'sa', filename)
    const new_path = path.join(__dirname, 'sa/invalid', filename)
    fs.renameSync(oldpath, new_path)
  }
}

async function choose (count) {
  const answer = await prompts({
    type: 'select',
    name: 'value',
    message: `Detcted ${count} Invalid SA，Whether to move them to the sa/invalid Folder？`,
    choices: [
      { title: 'Yes', description: 'Confirm Move', value: 'yes' },
      { title: 'No', description: 'Exit without making changes', value: 'no' }
    ],
    initial: 0
  })
  return answer.value
}

async function get_invalid_sa (arr, fid) {
  if (!fid) throw new Error('Please specify the ID of the directory to check permissions')
  const fails = []
  let flag = 0
  let good = 0
  for (const v of arr) {
    console.log('Inspection Progress', `${flag++}/${arr.length}`)
    console.log('Normal/Abnormal', `${good}/${fails.length}`)
    const {gtoken, filename} = v 
    try {
      const access_token = await get_sa_token(gtoken)
      await get_info(fid, access_token)
      good++
    } catch (e) {
      handle_error(e)
      const status = e && e.response && e.response.status
      if (Number(status) === 400) fails.push(filename) // access_token Failed

      const data = e && e.response && e.response.data
      const code = data && data.error && data.error.code
      if ([404, 403].includes(Number(code))) fails.push(filename) // Failed to read folder information
    }
  }
  return fails
}

function handle_error (err) {
  const data = err && err.response && err.response.data
  if (data) {
    console.error(JSON.stringify(data))
  } else {
    console.error(err.message)
  }
}

async function get_info (fid, access_token) {
  let url = `https://www.googleapis.com/drive/v3/files/${fid}`
  let params = {
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    corpora: 'allDrives',
    fields: 'id,name'
  }
  url += '?' + params_to_query(params)
  const headers = { authorization: 'Bearer ' + access_token }
  const { data } = await axins.get(url, { headers })
  return data
}

function params_to_query (data) {
  const ret = []
  for (let d in data) {
    ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]))
  }
  return ret.join('&')
}

async function get_sa_token (gtoken) {
  return new Promise((resolve, reject) => {
    gtoken.getToken((err, tk) => {
      err ? reject(err) : resolve(tk.access_token)
    })
  })
}

function validate_fid (fid) {
  if (!fid) return false
  fid = String(fid)
  if (fid.length < 10 || fid.length > 100) return false
  const reg = /^[a-zA-Z0-9_-]+$/
  return fid.match(reg)
}
