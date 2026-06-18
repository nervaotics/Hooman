/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  const hasOpening = await knex.schema.hasColumn('coa_accounts', 'opening_balance')
  if (!hasOpening) {
    await knex.schema.alterTable('coa_accounts', (t) => {
      t.decimal('opening_balance', 14, 2).notNullable().defaultTo(0)
    })
  }

  await knex.raw(
    "ALTER TABLE journal_vouchers MODIFY COLUMN status ENUM('draft','posted','voided') NOT NULL DEFAULT 'draft'",
  )
}

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex('journal_vouchers').where('status', 'voided').update({ status: 'draft' })
  await knex.raw(
    "ALTER TABLE journal_vouchers MODIFY COLUMN status ENUM('draft','posted') NOT NULL DEFAULT 'draft'",
  )

  const hasOpening = await knex.schema.hasColumn('coa_accounts', 'opening_balance')
  if (hasOpening) {
    await knex.schema.alterTable('coa_accounts', (t) => {
      t.dropColumn('opening_balance')
    })
  }
}
