import knex from 'knex';

import { connection } from '../orm.config';

import dotenv from 'dotenv';
import { ConnectionString } from 'connection-string';
dotenv.config();

async function main() {
	const { clientUrl } = connection;

	const dbName = new ConnectionString(clientUrl).path?.[0];

	if (!dbName) throw new Error('Expected dbName in connection');

	const { ADMIN_CONNECTION_STRING } = process.env;

	const k = knex({
		client: 'pg',
		connection: ADMIN_CONNECTION_STRING
	});

	const dbs = await k.raw(
		`SELECT * from pg_database WHERE datname = '${dbName}';`
	);

	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
	if (dbs.rows.some((r: any) => r.datname === dbName)) {
		console.log(`found ${dbName} database`);
	} else {
		await k.raw(`CREATE DATABASE "${dbName}";`);
		console.log(`${dbName} database created`);
	}

	await k.destroy();
}

main().then(
	() => process.exit(0),
	err => {
		console.error(err);
		process.exit(1);
	}
);