/**
 * Align employee schema with Hooman web reference (areas, postings, history, salary).
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  const hasAreas = await knex.schema.hasTable('areas')
  if (!hasAreas) {
    await knex.schema.createTable('areas', (t) => {
      t.increments('id').primary()
      t.string('name').notNullable()
      t.string('code').unique()
      t.boolean('is_deleted').defaultTo(false)
      t.timestamps(true, true)
    })
  }

  const employeeCols = [
    ['name', (t) => t.string('name')],
    ['employee_type', (t) => t.string('employee_type')],
    ['father_husband_name', (t) => t.string('father_husband_name')],
    ['marital_status', (t) => t.string('marital_status')],
    ['religion', (t) => t.string('religion')],
    ['cnic_number', (t) => t.string('cnic_number')],
    ['cnic_issue_date', (t) => t.date('cnic_issue_date')],
    ['cnic_expiry_date', (t) => t.date('cnic_expiry_date')],
    ['phone_number', (t) => t.string('phone_number')],
    ['emergency_contact', (t) => t.string('emergency_contact')],
    ['address_street', (t) => t.string('address_street')],
    ['address_city', (t) => t.string('address_city')],
    ['release_date', (t) => t.date('release_date')],
    ['is_deleted', (t) => t.boolean('is_deleted').defaultTo(false)],
  ]

  for (const [col, add] of employeeCols) {
    const exists = await knex.schema.hasColumn('employees', col)
    if (!exists) {
      await knex.schema.alterTable('employees', add)
    }
  }

  const hasCnic = await knex.schema.hasColumn('employees', 'cnic')
  const hasCnicNumber = await knex.schema.hasColumn('employees', 'cnic_number')
  if (hasCnic && hasCnicNumber) {
    await knex.raw('UPDATE employees SET cnic_number = cnic WHERE cnic_number IS NULL AND cnic IS NOT NULL')
  }

  const hasPhone = await knex.schema.hasColumn('employees', 'phone')
  const hasPhoneNumber = await knex.schema.hasColumn('employees', 'phone_number')
  if (hasPhone && hasPhoneNumber) {
    await knex.raw('UPDATE employees SET phone_number = phone WHERE phone_number IS NULL AND phone IS NOT NULL')
  }

  if (!(await knex.schema.hasTable('employee_postings'))) {
    await knex.schema.createTable('employee_postings', (t) => {
      t.increments('id').primary()
      t.integer('employee_id').unsigned().references('id').inTable('employees').onDelete('CASCADE')
      t.integer('area_id').unsigned().references('id').inTable('areas').onDelete('SET NULL').nullable()
      t.integer('department_id').unsigned().references('id').inTable('departments').onDelete('SET NULL').nullable()
      t.date('joining_date')
      t.date('release_date')
      t.boolean('is_current').defaultTo(true)
      t.timestamps(true, true)
    })
  }

  if (!(await knex.schema.hasTable('employment_history'))) {
    await knex.schema.createTable('employment_history', (t) => {
      t.increments('id').primary()
      t.integer('employee_id').unsigned().references('id').inTable('employees').onDelete('CASCADE')
      t.string('company').notNullable()
      t.date('period_from').notNullable()
      t.date('period_to')
      t.boolean('is_current').defaultTo(false)
      t.timestamps(true, true)
    })
  }

  if (!(await knex.schema.hasTable('salary_structure'))) {
    await knex.schema.createTable('salary_structure', (t) => {
      t.increments('id').primary()
      t.integer('employee_id').unsigned().references('id').inTable('employees').onDelete('CASCADE')
      t.date('effective_from').notNullable()
      t.date('effective_to')
      t.decimal('basic_salary', 12, 2).notNullable()
      t.decimal('house_rent_allowance', 12, 2).defaultTo(0)
      t.decimal('transport_allowance', 12, 2).defaultTo(0)
      t.decimal('medical_allowance', 12, 2).defaultTo(0)
      t.decimal('special_allowance', 12, 2).defaultTo(0)
      t.decimal('gross_salary', 12, 2)
      t.boolean('is_current').defaultTo(true)
      t.timestamps(true, true)
    })
  }
}

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('salary_structure')
  await knex.schema.dropTableIfExists('employment_history')
  await knex.schema.dropTableIfExists('employee_postings')
  await knex.schema.dropTableIfExists('areas')
}
