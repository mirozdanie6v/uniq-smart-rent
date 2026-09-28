import {Driver} from '@ydbjs/core';
import {query} from '@ydbjs/query';
import {MetadataCredentialsProvider} from '@ydbjs/auth/metadata';
import {Uint64} from '@ydbjs/value/primitive';

export const AUTO_SALE_DOMAIN_SCHEMA_VERSION=1;

export const AUTO_SALE_DOMAIN_TABLES=[
  'auto_sale_leads',
  'auto_sale_quotes',
  'auto_sale_orders',
  'auto_sale_payments',
  'auto_sale_notes',
  'auto_sale_team',
  'auto_sale_catalog',
  'auto_sale_telegram_bindings',
  'auto_sale_state_meta'
];

export async function ensureAutoSaleDomainSchema(sql){
  await sql`
    CREATE TABLE IF NOT EXISTS auto_sale_schema_meta (
      component Utf8 NOT NULL,
      version Uint64 NOT NULL,
      updated_at Utf8 NOT NULL,
      PRIMARY KEY (component)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS auto_sale_state_meta (
      id Uint64 NOT NULL,
      compat_revision Uint64 NOT NULL,
      schema_version Uint64 NOT NULL,
      migration_status Utf8 NOT NULL,
      source_revision Uint64,
      updated_at Utf8 NOT NULL,
      PRIMARY KEY (id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS auto_sale_leads (
      id Utf8 NOT NULL,
      row_version Uint64 NOT NULL,
      sort_order Uint64 NOT NULL,
      status Utf8 NOT NULL,
      manager Utf8 NOT NULL,
      source Utf8 NOT NULL,
      client_created Bool NOT NULL,
      payload Utf8 NOT NULL,
      updated_at Utf8 NOT NULL,
      PRIMARY KEY (id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS auto_sale_quotes (
      id Utf8 NOT NULL,
      row_version Uint64 NOT NULL,
      sort_order Uint64 NOT NULL,
      lead_id Utf8 NOT NULL,
      status Utf8 NOT NULL,
      quote_version Uint64 NOT NULL,
      payload Utf8 NOT NULL,
      updated_at Utf8 NOT NULL,
      PRIMARY KEY (id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS auto_sale_orders (
      id Utf8 NOT NULL,
      row_version Uint64 NOT NULL,
      sort_order Uint64 NOT NULL,
      lead_id Utf8 NOT NULL,
      stage Utf8 NOT NULL,
      manager Utf8 NOT NULL,
      risk_type Utf8 NOT NULL,
      payload Utf8 NOT NULL,
      updated_at Utf8 NOT NULL,
      PRIMARY KEY (id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS auto_sale_payments (
      order_id Utf8 NOT NULL,
      id Utf8 NOT NULL,
      sort_order Uint64 NOT NULL,
      amount Double NOT NULL,
      payment_date Utf8 NOT NULL,
      method Utf8 NOT NULL,
      payload Utf8 NOT NULL,
      created_at Utf8 NOT NULL,
      PRIMARY KEY (order_id, id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS auto_sale_notes (
      lead_id Utf8 NOT NULL,
      id Utf8 NOT NULL,
      sort_order Uint64 NOT NULL,
      text Utf8 NOT NULL,
      payload Utf8 NOT NULL,
      created_at Utf8 NOT NULL,
      PRIMARY KEY (lead_id, id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS auto_sale_team (
      id Utf8 NOT NULL,
      row_version Uint64 NOT NULL,
      sort_order Uint64 NOT NULL,
      name Utf8 NOT NULL,
      role Utf8 NOT NULL,
      active Bool NOT NULL,
      payload Utf8 NOT NULL,
      updated_at Utf8 NOT NULL,
      PRIMARY KEY (id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS auto_sale_catalog (
      id Utf8 NOT NULL,
      row_version Uint64 NOT NULL,
      sort_order Uint64 NOT NULL,
      origin Utf8 NOT NULL,
      active Bool NOT NULL,
      auction_date Utf8 NOT NULL,
      payload Utf8 NOT NULL,
      updated_at Utf8 NOT NULL,
      PRIMARY KEY (id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS auto_sale_telegram_bindings (
      subject_type Utf8 NOT NULL,
      subject_id Utf8 NOT NULL,
      telegram_user_id Utf8 NOT NULL,
      username Utf8 NOT NULL,
      first_name Utf8 NOT NULL,
      last_name Utf8 NOT NULL,
      linked_at Utf8 NOT NULL,
      updated_at Utf8 NOT NULL,
      PRIMARY KEY (subject_type, subject_id)
    )
  `;
  const component='auto-sale-domain';
  const version=new Uint64(BigInt(AUTO_SALE_DOMAIN_SCHEMA_VERSION));
  const now=new Date().toISOString();
  await sql`
    UPSERT INTO auto_sale_schema_meta (component, version, updated_at)
    VALUES (${component}, ${version}, ${now})
  `;
}

export async function createYdbDomainStore({
  connectionString,
  credentialsProvider=new MetadataCredentialsProvider()
}){
  const driver=new Driver(connectionString,{credentialsProvider});
  await driver.ready();
  const sql=query(driver);
  await ensureAutoSaleDomainSchema(sql);

  async function schemaVersion(){
    const component='auto-sale-domain';
    const [rows]=await sql`
      SELECT version
      FROM auto_sale_schema_meta
      WHERE component = ${component}
    `;
    return Number(rows[0]?.version||0n);
  }

  async function counts(){
    const result={};
    const queries=[
      ['auto_sale_leads',()=>sql`SELECT COUNT(*) AS count FROM auto_sale_leads`],
      ['auto_sale_quotes',()=>sql`SELECT COUNT(*) AS count FROM auto_sale_quotes`],
      ['auto_sale_orders',()=>sql`SELECT COUNT(*) AS count FROM auto_sale_orders`],
      ['auto_sale_payments',()=>sql`SELECT COUNT(*) AS count FROM auto_sale_payments`],
      ['auto_sale_notes',()=>sql`SELECT COUNT(*) AS count FROM auto_sale_notes`],
      ['auto_sale_team',()=>sql`SELECT COUNT(*) AS count FROM auto_sale_team`],
      ['auto_sale_catalog',()=>sql`SELECT COUNT(*) AS count FROM auto_sale_catalog`],
      ['auto_sale_telegram_bindings',()=>sql`SELECT COUNT(*) AS count FROM auto_sale_telegram_bindings`]
    ];
    for(const [name,run] of queries){
      const [rows]=await run();
      result[name]=Number(rows[0]?.count||0n);
    }
    return result;
  }

  async function close(){driver.close()}

  return{sql,schemaVersion,counts,close};
}
