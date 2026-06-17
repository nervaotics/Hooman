const { authorize } = require('../lib/authGuard.cjs')

/**
 * @param {import('electron').IpcMain} ipcMain
 * @param {import('electron-store')} store
 */
module.exports = function registerRecruitmentIpc(ipcMain, store) {
  ipcMain.handle('recruitment:getJobs', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'read' })
    return auth.knex('job_postings').select('*').orderBy('id', 'desc').limit(200)
  })

  ipcMain.handle('recruitment:createJob', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'write' })
    await auth.knex('job_postings').insert({
      ...auth.clean,
      created_at: new Date(),
      updated_at: new Date(),
    })
    return { ok: true }
  })

  ipcMain.handle('recruitment:getApplicants', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'read' })
    if (!auth.clean.jobId) throw new Error('jobId required')
    return auth.knex('applicants').where({ job_id: auth.clean.jobId }).orderBy('id', 'desc')
  })

  ipcMain.handle('recruitment:updateApplicant', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'write' })
    await auth.knex('applicants').where({ id: auth.clean.id }).update({
      stage: auth.clean.status,
      updated_at: new Date(),
    })
    return { ok: true }
  })
}
