const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'income', 'expense']
const VOUCHER_TYPES = ['RV', 'PV', 'JV', 'PC']

const DEFAULT_ACCOUNTS = [
  { code: '1000', name: 'Cash in Hand', account_type: 'asset' },
  { code: '1010', name: 'Bank Account', account_type: 'asset' },
  { code: '1020', name: 'Petty Cash', account_type: 'asset' },
  { code: '1100', name: 'Accounts Receivable', account_type: 'asset' },
  { code: '1200', name: 'Inventory', account_type: 'asset' },
  { code: '1500', name: 'Fixed Assets', account_type: 'asset' },
  { code: '2000', name: 'Accounts Payable', account_type: 'liability' },
  { code: '2100', name: 'Accrued Expenses', account_type: 'liability' },
  { code: '2200', name: 'Tax Payable', account_type: 'liability' },
  { code: '3000', name: 'Owner\'s Equity', account_type: 'equity' },
  { code: '3100', name: 'Retained Earnings', account_type: 'equity' },
  { code: '4000', name: 'Sales Revenue', account_type: 'income' },
  { code: '4100', name: 'Service Revenue', account_type: 'income' },
  { code: '4200', name: 'Other Income', account_type: 'income' },
  { code: '5000', name: 'Salaries & Wages', account_type: 'expense' },
  { code: '5100', name: 'Rent Expense', account_type: 'expense' },
  { code: '5200', name: 'Utilities Expense', account_type: 'expense' },
  { code: '5300', name: 'Office Supplies', account_type: 'expense' },
  { code: '5400', name: 'Miscellaneous Expense', account_type: 'expense' },
]

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.createTable('coa_accounts', (t) => {
    t.increments('id').primary()
    t.string('code', 32).notNullable().unique()
    t.string('name', 255).notNullable()
    t.enum('account_type', ACCOUNT_TYPES).notNullable()
    t.integer('parent_id').unsigned().nullable()
    t.boolean('is_active').notNullable().defaultTo(true)
    t.decimal('opening_balance', 14, 2).notNullable().defaultTo(0)
    t.text('description').nullable()
    t.timestamps(true, true)
    t.foreign('parent_id').references('id').inTable('coa_accounts').onDelete('SET NULL')
  })

  await knex.schema.createTable('journal_vouchers', (t) => {
    t.increments('id').primary()
    t.string('voucher_no', 64).notNullable().unique()
    t.enum('voucher_type', VOUCHER_TYPES).notNullable()
    t.date('voucher_date').notNullable()
    t.text('narration').nullable()
    t.enum('status', ['draft', 'posted', 'voided']).notNullable().defaultTo('draft')
    t.integer('created_by').unsigned().nullable()
    t.timestamps(true, true)
  })

  await knex.schema.createTable('journal_entries', (t) => {
    t.increments('id').primary()
    t.integer('voucher_id').unsigned().notNullable()
    t.integer('account_id').unsigned().notNullable()
    t.decimal('debit', 14, 2).notNullable().defaultTo(0)
    t.decimal('credit', 14, 2).notNullable().defaultTo(0)
    t.text('line_narration').nullable()
    t.integer('sort_order').notNullable().defaultTo(0)
    t.timestamps(true, true)
    t.foreign('voucher_id').references('id').inTable('journal_vouchers').onDelete('CASCADE')
    t.foreign('account_id').references('id').inTable('coa_accounts').onDelete('RESTRICT')
  })

  await knex('coa_accounts').insert(
    DEFAULT_ACCOUNTS.map((a) => ({
      ...a,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })),
  )
}

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('journal_entries')
  await knex.schema.dropTableIfExists('journal_vouchers')
  await knex.schema.dropTableIfExists('coa_accounts')
}
