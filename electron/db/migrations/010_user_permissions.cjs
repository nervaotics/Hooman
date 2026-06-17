/**
 * Granular module permissions for staff users (JSON on users.permissions).
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  const exists = await knex.schema.hasColumn('users', 'permissions')
  if (!exists) {
    await knex.schema.alterTable('users', (t) => {
      t.json('permissions').nullable()
    })
  }

  const legacyStaff = await knex('users')
    .where('role', 'hr_staff')
    .whereNull('permissions')
    .select('id')

  const defaultStaffPerms = JSON.stringify({
    employee_data: 'write',
    payroll_processing: 'write',
  })

  for (const row of legacyStaff) {
    // eslint-disable-next-line no-await-in-loop
    await knex('users').where({ id: row.id }).update({
      permissions: defaultStaffPerms,
      updated_at: new Date(),
    })
  }
}

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  const exists = await knex.schema.hasColumn('users', 'permissions')
  if (exists) {
    await knex.schema.alterTable('users', (t) => {
      t.dropColumn('permissions')
    })
  }
}
