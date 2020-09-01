#!/usr/bin/env node

const fs = require('fs')
const crypto = require('crypto')

const { format_size } = require('./src/summary')
const { get_name_by_id, get_sa_token, get_access_token, walk_and_save, validate_fid } = require('./src/gd')

const ID_DIR_MAPPING = {}
const FOLDER_TYPE = 'application/vnd.google-apps.folder'

const { argv } = require('yargs')
  .usage('Usage: ./$0 <folder-id> [options]')
  .alias('o', 'output')
  .describe('output', 'Specify Output File，Do not fill in the default url.txt')
  .alias('u', 'update')
  .describe('u', 'Do not use local cache, force to obtain source folder information online')
  .alias('S', 'service_account')
  .describe('S', 'Use service account to operate, provided that the sa authorized json file must be placed in the ./sa directory')
  .alias('k', 'hashkey')
  .describe('k', 'Use the hashkey set by the website deployed at https://github.com/iwestlin/gdshare to generate a legal download link')
  .alias('c', 'cf')
  .describe('cf', 'Website URL deployed using gdshare')
  .alias('e', 'expire')
  .describe('e', 'gdshare direct link expiration time, unit hour, default value 24')
  .help('h')
  .alias('h', 'help')

const [fid] = argv._
if (validate_fid(fid)) {
  let { update, service_account, output, hashkey, cf, expire } = argv
  output = output || 'uri.txt'
  gen_input_file({ fid, update, service_account, output, hashkey, cf, expire })
    .then(cmd => {
      console.log('Generated', output)
      console.log('Execute the command to download：\n', cmd)
    })
    .catch(console.error)
} else {
  console.warn('FolderID is wrong or invalid')
}

async function gen_input_file ({ fid, service_account, update, output, hashkey, cf, expire }) {
  const root = await get_name_by_id(fid, service_account)
  const data = await walk_and_save({ fid, service_account, update })
  const files = data.filter(v => v.mimeType !== FOLDER_TYPE)
  const folders = data.filter(v => v.mimeType === FOLDER_TYPE)
  let result
  if (hashkey && cf) {
    result = [`# aria2c -c --enable-rpc=false -i ${output}`]
  } else {
    const access_token = service_account ? (await get_sa_token()).access_token : await get_access_token()
    result = [`# aria2c -c --enable-rpc=false --header "Authorization: Bearer ${access_token}" -i ${output}`]
  }
  result = result.concat(files.map(file => {
    const { id, name, parent, size } = file
    const dir = get_dir(parent, folders)
    const download_uri = (hashkey && cf) ? gen_direct_link({ file, hashkey, cf, expire }) : `https://www.googleapis.com/drive/v3/files/${id}?alt=media`
    return `# File Size：${format_size(size)}
${download_uri}
  dir=${root}${dir}
  out=${name}`
  }))
  fs.writeFileSync(output, result.join('\n\n'))
  return result[0].replace('# ', '')
}

function gen_direct_link ({ file, hashkey, cf, expire }) {
  const { name, id } = file
  const expired = Date.now() + (Number(expire) || 24) * 3600 * 1000
  const str = `expired=${expired}&id=${id}`
  const sig = hmac(str, hashkey)
  if (!cf.startsWith('http')) cf = 'https://' + cf
  return `${cf}/api/download/${name}?${str}&sig=${sig}`
}

function hmac (str, hashkey) {
  return crypto.createHmac('sha256', hashkey).update(str).digest('hex')
}

function get_dir (id, folders) {
  let result = ID_DIR_MAPPING[id]
  if (result !== undefined) return result
  result = ''
  let temp = id
  let folder = folders.filter(v => v.id === temp)[0]
  while (folder) {
    result = `/${folder.name}` + result
    temp = folder.parent
    if (ID_DIR_MAPPING[temp]) {
      result = ID_DIR_MAPPING[temp] + result
      return ID_DIR_MAPPING[id] = result
    }
    folder = folders.filter(v => v.id === temp)[0]
  }
  return ID_DIR_MAPPING[id] = result
}
