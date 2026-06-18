const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'income', 'expense']
const VOUCHER_TYPES = ['RV', 'PV', 'JV', 'PC']
const DEBIT_NORMAL = new Set(['asset', 'expense'])

const VOUCHER_TYPE_LABELS = {
  RV: 'Receipt Voucher (RV)',
  PV: 'Payment Voucher (PV)',
  JV: 'Journal Voucher (JV)',
  PC: 'Petty Cash (PC)',
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

function dateKey(value) {
  if (!value) return ''
  const raw = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function assertAccountType(type) {
  if (!ACCOUNT_TYPES.includes(type)) {
    throw new Error(`Invalid account type. Use: ${ACCOUNT_TYPES.join(', ')}`)
  }
}

function assertVoucherType(type) {
  if (!VOUCHER_TYPES.includes(type)) {
    throw new Error(`Invalid voucher type. Use: ${VOUCHER_TYPES.join(', ')}`)
  }
}

function validateLines(lines) {
  if (!Array.isArray(lines) || lines.length < 2) {
    throw new Error('At least two journal lines are required (Dr. and Cr.)')
  }

  let totalDebit = 0
  let totalCredit = 0
  const normalized = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || {}
    const accountId = Number(line.account_id)
    if (!accountId) throw new Error(`Line ${i + 1}: account is required`)

    const debit = round2(line.debit)
    const credit = round2(line.credit)
    if (debit < 0 || credit < 0) throw new Error(`Line ${i + 1}: amounts cannot be negative`)
    if (debit > 0 && credit > 0) throw new Error(`Line ${i + 1}: enter either Dr. or Cr., not both`)
    if (debit === 0 && credit === 0) throw new Error(`Line ${i + 1}: enter a Dr. or Cr. amount`)

    totalDebit += debit
    totalCredit += credit
    normalized.push({
      account_id: accountId,
      debit,
      credit,
      line_narration: line.line_narration ? String(line.line_narration).trim() : null,
      sort_order: i,
    })
  }

  if (round2(totalDebit) !== round2(totalCredit)) {
    throw new Error(
      `Debits (${totalDebit.toFixed(2)}) must equal credits (${totalCredit.toFixed(2)})`,
    )
  }

  return { lines: normalized, totalDebit: round2(totalDebit), totalCredit: round2(totalCredit) }
}

function normalizeFilters(filters = {}) {
  return {
    account_type: filters.account_type,
    activeOnly: filters.activeOnly,
    voucher_type: filters.voucher_type,
    status: filters.status,
    from_date: dateKey(filters.from_date || filters.fromDate),
    to_date: dateKey(filters.to_date || filters.toDate),
    asOfDate: dateKey(filters.asOfDate || filters.as_of_date),
    accountId: filters.accountId || filters.account_id,
    fromDate: dateKey(filters.fromDate || filters.from_date),
    toDate: dateKey(filters.toDate || filters.to_date),
  }
}

function formatVoucher(voucher) {
  if (!voucher) return voucher
  return {
    ...voucher,
    voucher_type_label: VOUCHER_TYPE_LABELS[voucher.voucher_type] || voucher.voucher_type,
    lines: (voucher.entries || voucher.lines || []).map((e) => ({
      ...e,
      debit: round2(e.debit),
      credit: round2(e.credit),
    })),
  }
}

async function nextVoucherNo(knex, voucherType, voucherDate) {
  const year = dateKey(voucherDate).slice(0, 4) || String(new Date().getFullYear())
  const prefix = `${voucherType}-${year}-`
  const latest = await knex('journal_vouchers')
    .where('voucher_no', 'like', `${prefix}%`)
    .orderBy('id', 'desc')
    .first()

  let seq = 1
  if (latest?.voucher_no) {
    const part = latest.voucher_no.slice(prefix.length)
    const n = parseInt(part, 10)
    if (!Number.isNaN(n)) seq = n + 1
  }
  return `${prefix}${String(seq).padStart(4, '0')}`
}

function getMeta() {
  return {
    accountTypes: ACCOUNT_TYPES,
    voucherTypes: VOUCHER_TYPES,
    accountTypeLabels: {
      asset: 'Asset',
      liability: 'Liability',
      equity: 'Equity',
      income: 'Income',
      expense: 'Expense',
    },
    voucherTypeLabels: VOUCHER_TYPE_LABELS,
  }
}

async function listAccounts(knex, filters = {}) {
  const f = normalizeFilters(filters)
  let q = knex('coa_accounts').select('*').orderBy('code', 'asc')
  if (f.account_type) q = q.where('account_type', f.account_type)
  if (f.activeOnly) q = q.where('is_active', true)
  const rows = await q
  return rows.map((r) => ({ ...r, opening_balance: round2(r.opening_balance) }))
}

async function getAccount(knex, id) {
  const row = await knex('coa_accounts').where({ id }).first()
  if (!row) throw new Error('Account not found')
  return { ...row, opening_balance: round2(row.opening_balance) }
}

async function createAccount(knex, data) {
  const code = String(data.code || '').trim()
  const name = String(data.name || '').trim()
  if (!code) throw new Error('Account code is required')
  if (!name) throw new Error('Account name is required')
  assertAccountType(data.account_type)

  const exists = await knex('coa_accounts').where({ code }).first()
  if (exists) throw new Error(`Account code "${code}" already exists`)

  const [id] = await knex('coa_accounts').insert({
    code,
    name,
    account_type: data.account_type,
    parent_id: data.parent_id || null,
    is_active: data.is_active !== false,
    opening_balance: round2(data.opening_balance),
    description: data.description ? String(data.description).trim() : null,
    created_at: new Date(),
    updated_at: new Date(),
  })

  return getAccount(knex, id)
}

async function updateAccount(knex, id, data) {
  const existing = await knex('coa_accounts').where({ id }).first()
  if (!existing) throw new Error('Account not found')

  const payload = { updated_at: new Date() }
  if (data.code != null) {
    const code = String(data.code).trim()
    if (!code) throw new Error('Account code is required')
    const dup = await knex('coa_accounts').where({ code }).whereNot({ id }).first()
    if (dup) throw new Error(`Account code "${code}" already exists`)
    payload.code = code
  }
  if (data.name != null) {
    const name = String(data.name).trim()
    if (!name) throw new Error('Account name is required')
    payload.name = name
  }
  if (data.account_type != null) {
    assertAccountType(data.account_type)
    payload.account_type = data.account_type
  }
  if (data.parent_id !== undefined) payload.parent_id = data.parent_id || null
  if (data.is_active !== undefined) payload.is_active = Boolean(data.is_active)
  if (data.opening_balance !== undefined) payload.opening_balance = round2(data.opening_balance)
  if (data.description !== undefined) {
    payload.description = data.description ? String(data.description).trim() : null
  }

  await knex('coa_accounts').where({ id }).update(payload)
  return getAccount(knex, id)
}

async function deleteAccount(knex, id) {
  const existing = await knex('coa_accounts').where({ id }).first()
  if (!existing) throw new Error('Account not found')

  const used = await knex('journal_entries').where({ account_id: id }).first()
  if (used) throw new Error('Cannot delete an account that has journal entries')

  await knex('coa_accounts').where({ id }).delete()
  return { ok: true }
}

async function listVouchers(knex, filters = {}) {
  const f = normalizeFilters(filters)
  let q = knex('journal_vouchers')
    .select('*')
    .whereNot('status', 'voided')
    .orderBy('voucher_date', 'desc')
    .orderBy('id', 'desc')

  if (f.voucher_type) q = q.where('voucher_type', f.voucher_type)
  if (f.status) q = q.where('status', f.status)
  if (f.from_date) q = q.where('voucher_date', '>=', f.from_date)
  if (f.to_date) q = q.where('voucher_date', '<=', f.to_date)

  const vouchers = await q
  if (!vouchers.length) return []

  const ids = vouchers.map((v) => v.id)
  const entries = await knex('journal_entries as je')
    .join('coa_accounts as a', 'je.account_id', 'a.id')
    .select('je.*', 'a.code as account_code', 'a.name as account_name', 'a.account_type')
    .whereIn('je.voucher_id', ids)
    .orderBy('je.sort_order', 'asc')

  const byVoucher = new Map()
  for (const e of entries) {
    if (!byVoucher.has(e.voucher_id)) byVoucher.set(e.voucher_id, [])
    byVoucher.get(e.voucher_id).push(e)
  }

  return vouchers.map((v) =>
    formatVoucher({
      ...v,
      entries: byVoucher.get(v.id) || [],
      total_amount: (byVoucher.get(v.id) || []).reduce((s, e) => s + round2(e.debit), 0),
    }),
  )
}

async function getVoucher(knex, id) {
  const voucher = await knex('journal_vouchers').where({ id }).first()
  if (!voucher) throw new Error('Voucher not found')

  const entries = await knex('journal_entries as je')
    .join('coa_accounts as a', 'je.account_id', 'a.id')
    .select('je.*', 'a.code as account_code', 'a.name as account_name', 'a.account_type')
    .where('je.voucher_id', id)
    .orderBy('je.sort_order', 'asc')

  return formatVoucher({ ...voucher, entries })
}

async function createVoucher(knex, data, userId) {
  assertVoucherType(data.voucher_type)
  const voucherDate = dateKey(data.voucher_date)
  if (!voucherDate) throw new Error('Voucher date is required')

  const { lines } = validateLines(data.entries || data.lines || [])
  const voucherNo = await nextVoucherNo(knex, data.voucher_type, voucherDate)

  return knex.transaction(async (trx) => {
    const [voucherId] = await trx('journal_vouchers').insert({
      voucher_no: voucherNo,
      voucher_type: data.voucher_type,
      voucher_date: voucherDate,
      narration: data.narration ? String(data.narration).trim() : null,
      status: 'posted',
      created_by: userId || null,
      created_at: new Date(),
      updated_at: new Date(),
    })

    await trx('journal_entries').insert(
      lines.map((line) => ({
        ...line,
        voucher_id: voucherId,
        created_at: new Date(),
        updated_at: new Date(),
      })),
    )

    return getVoucher(trx, voucherId)
  })
}

async function updateVoucher(knex, id, data) {
  const existing = await knex('journal_vouchers').where({ id }).first()
  if (!existing) throw new Error('Voucher not found')
  if (existing.status !== 'draft') throw new Error('Only draft vouchers can be edited')

  const voucherDate = data.voucher_date != null ? dateKey(data.voucher_date) : existing.voucher_date
  if (!voucherDate) throw new Error('Voucher date is required')

  const linesInput = data.entries || data.lines
  const { lines } = linesInput ? validateLines(linesInput) : { lines: null }

  return knex.transaction(async (trx) => {
    const payload = { updated_at: new Date() }
    if (data.voucher_date != null) payload.voucher_date = voucherDate
    if (data.narration !== undefined) {
      payload.narration = data.narration ? String(data.narration).trim() : null
    }
    if (data.voucher_type != null) {
      assertVoucherType(data.voucher_type)
      payload.voucher_type = data.voucher_type
    }

    await trx('journal_vouchers').where({ id }).update(payload)

    if (lines) {
      await trx('journal_entries').where({ voucher_id: id }).delete()
      await trx('journal_entries').insert(
        lines.map((line) => ({
          ...line,
          voucher_id: id,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      )
    }

    return getVoucher(trx, id)
  })
}

async function deleteVoucher(knex, id) {
  const existing = await knex('journal_vouchers').where({ id }).first()
  if (!existing) throw new Error('Voucher not found')
  if (existing.status === 'posted') throw new Error('Posted vouchers cannot be deleted — void instead')

  await knex('journal_vouchers').where({ id }).delete()
  return { ok: true }
}

async function voidVoucher(knex, id) {
  const existing = await knex('journal_vouchers').where({ id }).first()
  if (!existing) throw new Error('Voucher not found')
  if (existing.status === 'voided') throw new Error('Voucher is already voided')
  if (existing.status !== 'posted') throw new Error('Only posted vouchers can be voided')

  await knex('journal_vouchers').where({ id }).update({
    status: 'voided',
    updated_at: new Date(),
  })

  return { ok: true }
}

async function postVoucher(knex, id) {
  const voucher = await getVoucher(knex, id)
  if (voucher.status === 'posted') throw new Error('Voucher is already posted')
  validateLines(voucher.lines)

  await knex('journal_vouchers').where({ id }).update({
    status: 'posted',
    updated_at: new Date(),
  })

  return getVoucher(knex, id)
}

async function postedEntryQuery(knex, filters = {}) {
  const f = normalizeFilters(filters)
  let q = knex('journal_entries as je')
    .join('journal_vouchers as jv', 'je.voucher_id', 'jv.id')
    .join('coa_accounts as a', 'je.account_id', 'a.id')
    .where('jv.status', 'posted')
    .select(
      'je.id',
      'je.voucher_id',
      'je.account_id',
      'je.debit',
      'je.credit',
      'je.line_narration',
      'jv.voucher_no',
      'jv.voucher_type',
      'jv.voucher_date',
      'jv.narration',
      'a.code as account_code',
      'a.name as account_name',
      'a.account_type',
    )

  if (f.accountId) q = q.where('je.account_id', f.accountId)
  if (f.asOfDate) q = q.where('jv.voucher_date', '<=', f.asOfDate)
  if (f.fromDate) q = q.where('jv.voucher_date', '>=', f.fromDate)
  if (f.toDate) q = q.where('jv.voucher_date', '<=', f.toDate)

  return q.orderBy('jv.voucher_date', 'asc').orderBy('jv.id', 'asc').orderBy('je.sort_order', 'asc')
}

function signedBalance(accountType, debit, credit) {
  const d = round2(debit)
  const c = round2(credit)
  if (DEBIT_NORMAL.has(accountType)) return round2(d - c)
  return round2(c - d)
}

function openingBalanceAmount(account) {
  return round2(account.opening_balance)
}

async function getLedger(knex, filters) {
  const f = normalizeFilters(filters)
  const account = await knex('coa_accounts').where({ id: f.accountId }).first()
  if (!account) throw new Error('Account not found')

  const rows = await postedEntryQuery(knex, f)
  const opening = openingBalanceAmount(account)
  let running = opening

  const entries = rows.map((row) => {
    const delta = signedBalance(account.account_type, row.debit, row.credit)
    running = round2(running + delta)
    return {
      ...row,
      debit: round2(row.debit),
      credit: round2(row.credit),
      balance: running,
    }
  })

  const totals = rows.reduce(
    (acc, row) => ({
      debit: round2(acc.debit + round2(row.debit)),
      credit: round2(acc.credit + round2(row.credit)),
    }),
    { debit: 0, credit: 0 },
  )

  return {
    account,
    opening_balance: opening,
    closing_balance: running,
    entries,
    totals,
  }
}

async function getTrialBalance(knex, filters = {}) {
  const f = normalizeFilters(filters)
  const accounts = await knex('coa_accounts').where('is_active', true).orderBy('code', 'asc')
  const rows = await postedEntryQuery(knex, { asOfDate: f.asOfDate })

  const sums = new Map()
  for (const row of rows) {
    if (!sums.has(row.account_id)) sums.set(row.account_id, { debit: 0, credit: 0 })
    const s = sums.get(row.account_id)
    s.debit = round2(s.debit + round2(row.debit))
    s.credit = round2(s.credit + round2(row.credit))
  }

  const reportRows = []
  let totalDebit = 0
  let totalCredit = 0

  for (const account of accounts) {
    const s = sums.get(account.id) || { debit: 0, credit: 0 }
    const opening = openingBalanceAmount(account)

    let balance = signedBalance(account.account_type, s.debit, s.credit)
    balance = round2(balance + opening)

    if (balance === 0 && s.debit === 0 && s.credit === 0 && opening === 0) continue

    const debit = balance > 0 ? balance : 0
    const credit = balance < 0 ? Math.abs(balance) : 0

    totalDebit = round2(totalDebit + debit)
    totalCredit = round2(totalCredit + credit)

    reportRows.push({
      account_id: account.id,
      code: account.code,
      name: account.name,
      account_type: account.account_type,
      debit,
      credit,
    })
  }

  return {
    asOfDate: f.asOfDate || null,
    rows: reportRows,
    totalDebit,
    totalCredit,
    balanced: totalDebit === totalCredit,
  }
}

async function getBalanceSheet(knex, filters = {}) {
  const trial = await getTrialBalance(knex, filters)

  const assets = []
  const liabilities = []
  const equity = []
  let totalIncome = 0
  let totalExpense = 0

  for (const row of trial.rows) {
    const item = {
      account_id: row.account_id,
      code: row.code,
      name: row.name,
      balance: row.debit > 0 ? row.debit : row.credit,
    }

    if (row.account_type === 'asset') assets.push(item)
    else if (row.account_type === 'liability') liabilities.push(item)
    else if (row.account_type === 'equity') equity.push(item)
    else if (row.account_type === 'income') totalIncome = round2(totalIncome + item.balance)
    else if (row.account_type === 'expense') totalExpense = round2(totalExpense + item.balance)
  }

  const netIncome = round2(totalIncome - totalExpense)
  const totalAssets = round2(assets.reduce((s, r) => s + r.balance, 0))
  const totalLiabilities = round2(liabilities.reduce((s, r) => s + r.balance, 0))
  const equityAccountsTotal = round2(equity.reduce((s, r) => s + r.balance, 0))
  const totalEquity = round2(equityAccountsTotal + netIncome)
  const totalLiabilitiesAndEquity = round2(totalLiabilities + totalEquity)

  return {
    asOfDate: trial.asOfDate,
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    totalLiabilitiesAndEquity,
    netIncome,
    totalIncome,
    totalExpense,
    balanced: totalAssets === totalLiabilitiesAndEquity,
  }
}

module.exports = {
  getMeta,
  listAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  listVouchers,
  getVoucher,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  voidVoucher,
  postVoucher,
  getLedger,
  getTrialBalance,
  getBalanceSheet,
}
