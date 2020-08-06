const Table = require('cli-table3')
const dayjs = require('dayjs')
const axios = require('@viegg/axios')
const HttpsProxyAgent = require('https-proxy-agent')

const { db } = require('../db')
const { gen_count_body, validate_fid, real_copy, get_name_by_id, get_info_by_id, copy_file } = require('./gd')
const { AUTH, DEFAULT_TARGET, USE_PERSONAL_AUTH } = require('../config')
const { tg_token } = AUTH
const gen_link = (fid, text) => `<a href="https://drive.google.com/drive/folders/${fid}">${text || fid}</a>`

if (!tg_token) throw new Error('Please set tg_token in config.js first')
const { https_proxy } = process.env
const axins = axios.create(https_proxy ? { httpsAgent: new HttpsProxyAgent(https_proxy) } : {})

const FID_TO_NAME = {}

async function get_folder_name (fid) {
  let name = FID_TO_NAME[fid]
  if (name) return name
  name = await get_name_by_id(fid, !USE_PERSONAL_AUTH)
  return FID_TO_NAME[fid] = name
}

function send_help (chat_id) {
  const text = `<pre>[Using help]
command ｜ Description
=====================
/help | To view instructions
=====================
/count FolderID [-u] | Calculate Size of the Given Link
。If you add -u at the end，Ignore the previous record and force it to be obtained online
=====================
/copy sourceID destinationID [-u] | Copy from source to destination(a new folder will be created)
If DestinationID is  not give.default folderID from config.js is taken as destination。
If bookmark is set，Then bookmark will be used as destinationID。
If -u is added at the end，information about the process is obtained online。
When the command is run,it wil spit out the Task ID。
=====================
/task | Return the info about the corresponding task
Example：
/task | Return details of all running tasks
/task 7 | Return task number 7
/task all | Return to list of all task records
/task clear | Clear all task records with completed status
/task rm 7 | Delete task record number 7
=====================
/bm [action] [alias] [target] | bookmark，Add common destination folderID
Example：
/bm | Return to favorites of all settings
/bm set movie folder-id | Add folder-id to favorites，It is set as Movie
/bm unset movie | Delete this favorite
</pre>`
  return sm({ chat_id, text, parse_mode: 'HTML' })
}

function send_bm_help (chat_id) {
  const text = `<pre>/bm [action] [alias] [target] | bookmark，Add common destination folderID
After entering the URL, it will appear below the two buttons "Document Statistics" and "Start Copying"，Easy to copy to frequently used locations。
Example：
/bm | Return all favorites
/bm set movie folder-id | Add folder-id to favorites，The alias is set to movie
/bm unset movie | Delete this favorite
</pre>`
  return sm({ chat_id, text, parse_mode: 'HTML' })
}

function send_task_help (chat_id) {
  const text = `<pre>/task [action/id] [id] | Manage running tasks
Example：
/task | Return details of all running tasks
/task 7 | Return task number 7
/task all | Return to list of all task records
/task clear | Clear all task records with completed status
/task rm 7 | Delete task number 7
</pre>`
  return sm({ chat_id, text, parse_mode: 'HTML' })
}

function clear_tasks (chat_id) {
  const finished_tasks = db.prepare('select id from task where status=?').all('finished')
  finished_tasks.forEach(task => rm_task({ task_id: task.id }))
  sm({ chat_id, text: 'Cleared all task records whose status is completed' })
}

function rm_task ({ task_id, chat_id }) {
  const exist = db.prepare('select id from task where id=?').get(task_id)
  if (!exist) return sm({ chat_id, text: `No number exists ${task_id} Task record` })
  db.prepare('delete from task where id=?').run(task_id)
  db.prepare('delete from copied where taskid=?').run(task_id)
  if (chat_id) sm({ chat_id, text: `Task deleted ${task_id} Record` })
}

function send_all_bookmarks (chat_id) {
  let records = db.prepare('select alias, target from bookmark').all()
  if (!records.length) return sm({ chat_id, text: 'No favorites in the database' })
  const tb = new Table({ style: { head: [], border: [] } })
  const headers = ['alias', 'FolderID']
  records = records.map(v => [v.alias, v.target])
  tb.push(headers, ...records)
  const text = tb.toString().replace(/─/g, '—')
  return sm({ chat_id, text: `<pre>${text}</pre>`, parse_mode: 'HTML' })
}

function set_bookmark ({ chat_id, alias, target }) {
  const record = db.prepare('select alias from bookmark where alias=?').get(alias)
  if (record) return sm({ chat_id, text: 'A bookmark with the same name already exists in the database' })
  db.prepare('INSERT INTO bookmark (alias, target) VALUES (?, ?)').run(alias, target)
  return sm({ chat_id, text: `Bookmark successfully set：${alias} | ${target}` })
}

function unset_bookmark ({ chat_id, alias }) {
  const record = db.prepare('select alias from bookmark where alias=?').get(alias)
  if (!record) return sm({ chat_id, text: 'No favourites found' })
  db.prepare('delete from bookmark where alias=?').run(alias)
  return sm({ chat_id, text: 'Successfully deleted favorites ' + alias })
}

function get_target_by_alias (alias) {
  const record = db.prepare('select target from bookmark where alias=?').get(alias)
  return record && record.target
}

function get_alias_by_target (target) {
  const record = db.prepare('select alias from bookmark where target=?').get(target)
  return record && record.alias
}

function send_choice ({ fid, chat_id }) {
  return sm({
    chat_id,
    text: `Identify the shared ID ${fid}，Please select any one option`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'File stats', callback_data: `count ${fid}` },
          { text: 'Start copying', callback_data: `copy ${fid}` }
        ],
        [
          { text: 'Forced refresh', callback_data: `update ${fid}` },
          { text: 'Clear', callback_data: `clear_button` }
        ]
      ].concat(gen_bookmark_choices(fid))
    }
  })
}

function clear_button ({ message_id, text, chat_id }) {
  const url = `https://api.telegram.org/bot${tg_token}/editMessageText`
  return axins.post(url, { chat_id, message_id, text, parse_mode: 'HTML' }).catch(e => {
    console.error('fail to clear_button', e.message)
  })
}

// console.log(gen_bookmark_choices())
function gen_bookmark_choices (fid) {
  const gen_choice = v => ({ text: `Copy to ${v.alias}`, callback_data: `copy ${fid} ${v.alias}` })
  const records = db.prepare('select * from bookmark').all()
  const result = []
  for (let i = 0; i < records.length; i += 2) {
    const line = [gen_choice(records[i])]
    if (records[i + 1]) line.push(gen_choice(records[i + 1]))
    result.push(line)
  }
  return result
}

async function send_all_tasks (chat_id) {
  let records = db.prepare('select id, status, ctime from task').all()
  if (!records.length) return sm({ chat_id, text: 'There is no task record in the database' })
  const tb = new Table({ style: { head: [], border: [] } })
  const headers = ['ID', 'status', 'ctime']
  records = records.map(v => {
    const { id, status, ctime } = v
    return [id, status, dayjs(ctime).format('YYYY-MM-DD HH:mm:ss')]
  })
  tb.push(headers, ...records)
  const text = tb.toString().replace(/─/g, '—')
  const url = `https://api.telegram.org/bot${tg_token}/sendMessage`
  return axins.post(url, {
    chat_id,
    parse_mode: 'HTML',
    text: `All copy tasks：\n<pre>${text}</pre>`
  }).catch(err => {
    // const description = err.response && err.response.data && err.response.data.description
    // if (description && description.includes('message is too long')) {
    if (true) {
      const text = [headers].concat(records).map(v => v.join('\t')).join('\n')
      return sm({ chat_id, parse_mode: 'HTML', text: `All copy tasks：\n<pre>${text}</pre>` })
    }
    console.error(err)
  })
}

async function get_task_info (task_id) {
  const record = db.prepare('select * from task where id=?').get(task_id)
  if (!record) return {}
  const { source, target, status, mapping, ctime, ftime } = record
  const { copied_files } = db.prepare('select count(fileid) as copied_files from copied where taskid=?').get(task_id)
  const folder_mapping = mapping && mapping.trim().split('\n')
  const new_folder = folder_mapping && folder_mapping[0].split(' ')[1]
  const { summary } = db.prepare('select summary from gd where fid=?').get(source) || {}
  const { file_count, folder_count, total_size } = summary ? JSON.parse(summary) : {}
  const total_count = (file_count || 0) + (folder_count || 0)
  const copied_folders = folder_mapping ? (folder_mapping.length - 1) : 0
  let text = 'Task number：' + task_id + '\n'
  const folder_name = await get_folder_name(source)
  text += 'Source folder：' + gen_link(source, folder_name) + '\n'
  text += 'Destination Location：' + gen_link(target, get_alias_by_target(target)) + '\n'
  text += 'New Folder：' + (new_folder ? gen_link(new_folder) : 'Not created yet') + '\n'
  text += 'Task status：' + status + '\n'
  text += 'Creation Time：' + dayjs(ctime).format('YYYY-MM-DD HH:mm:ss') + '\n'
  text += 'Complete Time：' + (ftime ? dayjs(ftime).format('YYYY-MM-DD HH:mm:ss') : 'Undone') + '\n'
  text += 'Folder progress：' + copied_folders + '/' + (folder_count === undefined ? 'Unknown Count' : folder_count) + '\n'
  text += 'File progress：' + copied_files + '/' + (file_count === undefined ? 'Unknown count' : file_count) + '\n'
  text += 'Total percentage：' + ((copied_files + copied_folders) * 100 / total_count).toFixed(2) + '%\n'
  text += 'Total Size：' + (total_size || 'Unknown Size')
  return { text, status, folder_count }
}

async function send_task_info ({ task_id, chat_id }) {
  const { text, status, folder_count } = await get_task_info(task_id)
  if (!text) return sm({ chat_id, text: 'The task ID does not exist in the database：' + task_id })
  const url = `https://api.telegram.org/bot${tg_token}/sendMessage`
  let message_id
  try {
    const { data } = await axins.post(url, { chat_id, text, parse_mode: 'HTML' })
    message_id = data && data.result && data.result.message_id
  } catch (e) {
    console.log('fail to send message to tg', e.message)
  }
  // get_task_info Eat cpu when the number of task directories is too large，In the future, it is better to save the mapping as a separate table
  if (!message_id || status !== 'copying') return
  const loop = setInterval(async () => {
    const url = `https://api.telegram.org/bot${tg_token}/editMessageText`
    const { text, status } = await get_task_info(task_id)
    if (status !== 'copying') clearInterval(loop)
    axins.post(url, { chat_id, message_id, text, parse_mode: 'HTML' }).catch(e => console.error(e.message))
  }, 10 * 1000)
}

async function tg_copy ({ fid, target, chat_id, update }) { // return task_id
  target = target || DEFAULT_TARGET
  if (!target) {
    sm({ chat_id, text: 'Please enter the destination ID or set the default copy destination ID in config.js first(DEFAULT_TARGET)' })
    return
  }
  const file = await get_info_by_id(fid, !USE_PERSONAL_AUTH)
  if (file && file.mimeType !== 'application/vnd.google-apps.folder') {
    return copy_file(fid, target, !USE_PERSONAL_AUTH).then(data => {
      sm({ chat_id, parse_mode: 'HTML', text: `File copied succesfully，File Location：${gen_link(target)}` })
    }).catch(e => {
      sm({ chat_id, text: `Failed to copy the file, failure message：${e.message}` })
    })
  }

  let record = db.prepare('select id, status from task where source=? and target=?').get(fid, target)
  if (record) {
    if (record.status === 'copying') {
      sm({ chat_id, text: 'Tasks with the same source ID and destination ID are already in progress，to know about the progress type /task ' + record.id })
      return
    } else if (record.status === 'finished') {
      sm({ chat_id, text: `existing task Detected ${record.id}，Start Copying` })
    }
  }

  real_copy({ source: fid, update, target, service_account: !USE_PERSONAL_AUTH, is_server: true })
    .then(async info => {
      if (!record) record = {} // Prevent infinite loop
      if (!info) return
      const { task_id } = info
      const { text } = await get_task_info(task_id)
      sm({ chat_id, text, parse_mode: 'HTML' })
    })
    .catch(err => {
      const task_id = record && record.id
      if (task_id) db.prepare('update task set status=? where id=?').run('error', task_id)
      if (!record) record = {}
      console.error('Copy Failed', fid, '-->', target)
      console.error(err)
      sm({ chat_id, text: (task_id || '') + 'Task error, error message：' + err.message })
    })

  while (!record) {
    record = db.prepare('select id from task where source=? and target=?').get(fid, target)
    await sleep(1000)
  }
  return record.id
}

function sleep (ms) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms)
  })
}

function reply_cb_query ({ id, data }) {
  const url = `https://api.telegram.org/bot${tg_token}/answerCallbackQuery`
  return axins.post(url, {
    callback_query_id: id,
    text: 'Start processing ' + data
  })
}

async function send_count ({ fid, chat_id, update }) {
  sm({ chat_id, text: `Get Started ${fid} Collecting files info，Please wait，It is recommended not to start copying before the statistics are completed，Because copying also needs to get the source folder info first` })
  const table = await gen_count_body({ fid, update, type: 'tg', service_account: !USE_PERSONAL_AUTH })
  if (!table) return sm({ chat_id, parse_mode: 'HTML', text: gen_link(fid) + ' Failed to obtain info' })
  const url = `https://api.telegram.org/bot${tg_token}/sendMessage`
  const gd_link = `https://drive.google.com/drive/folders/${fid}`
  const name = await get_folder_name(fid)
  return axins.post(url, {
    chat_id,
    parse_mode: 'HTML',
    text: `<pre>Source Folder Name：${name}
Source Link：${gd_link}
${table}</pre>`
  }).catch(async err => {
    // const description = err.response && err.response.data && err.response.data.description
    // const too_long_msgs = ['request entity too large', 'message is too long']
    // if (description && too_long_msgs.some(v => description.toLowerCase().includes(v))) {
    if (true) {
      const smy = await gen_count_body({ fid, type: 'json', service_account: !USE_PERSONAL_AUTH })
      const { file_count, folder_count, total_size } = JSON.parse(smy)
      return sm({
        chat_id,
        parse_mode: 'HTML',
        text: `Link：<a href="https://drive.google.com/drive/folders/${fid}">${fid}</a>\n<pre>
The table is too long and exceeds the telegram message limit，Only show summary：
Folder name：${name}
Total number of Files：${file_count}
Total number of Folders：${folder_count}
Total Size：${total_size}
</pre>`
      })
    }
    throw err
  })
}

function sm (data) {
  const url = `https://api.telegram.org/bot${tg_token}/sendMessage`
  return axins.post(url, data).catch(err => {
    // console.error('fail to post', url, data)
    console.error('fail to send message to tg:', err.message)
  })
}

function extract_fid (text) {
  text = text.replace(/^\/count/, '').replace(/^\/copy/, '').replace(/\\/g, '').trim()
  const [source, target] = text.split(' ').map(v => v.trim())
  if (validate_fid(source)) return source
  try {
    if (!text.startsWith('http')) text = 'https://' + text
    const u = new URL(text)
    if (u.pathname.includes('/folders/')) {
      return u.pathname.split('/').map(v => v.trim()).filter(v => v).pop()
    } else if (u.pathname.includes('/file/')) {
      const file_reg = /file\/d\/([a-zA-Z0-9_-]+)/
      const file_match = u.pathname.match(file_reg)
      return file_match && file_match[1]
    }
    return u.searchParams.get('id')
  } catch (e) {
    return ''
  }
}

function extract_from_text (text) {
  const reg = /https?:\/\/drive.google.com\/[^\s]+/g
  const m = text.match(reg)
  return m && extract_fid(m[0])
}

module.exports = { send_count, send_help, sm, extract_fid, reply_cb_query, send_choice, send_task_info, send_all_tasks, tg_copy, extract_from_text, get_target_by_alias, send_bm_help, send_all_bookmarks, set_bookmark, unset_bookmark, clear_tasks, send_task_help, rm_task, clear_button }
