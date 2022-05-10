import { Options, ConnectionOptions } from '@mikro-orm/core';
import { DailyCheckIn } from './entities/DailyCheckIn.entity';

import dotenv from 'dotenv';

let connection: ConnectionOptions;

// const { VERCEL } = process.env;

const entities = [DailyCheckIn];

dotenv.config();

const { DB_USER, DB_PASSWORD } = process.env;
connection = {
	host: 'localhost',
	dbName: 'sylvabot',
	user: DB_USER,
	password: DB_PASSWORD
};

const config: Options = {
	type: 'postgresql',
	entities,
	discovery: {
		disableDynamicFileAccess: true
	},
	...connection,
	baseDir: process.cwd()
};

export default config;
export { connection };