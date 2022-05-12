import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { addDays } from 'date-fns';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { EntityRepository, SqlEntityRepository } from '@mikro-orm/postgresql';
import { DailyCheckIn } from './entities/DailyCheckIn.entity';
import { CronJob } from 'cron';

dotenv.config();
dotenv.config();

// replace the value below with the Telegram token you receive from @BotFather
const { TOKEN, CHAT_ID, CRON } = process.env;

if (!TOKEN || !CHAT_ID || !CRON) {
	console.error('missing an argument!');
	process.exit(1);
}

class SylvaBot {
	private readonly bot: TelegramBot;
	private readonly orm: Promise<MikroORM>;

	private readonly commands: Record<string, () => Promise<void>> = {
		force: () => this.process()

	}

	constructor(private readonly chat: string, token: string) {
		this.bot = new TelegramBot(token, { polling: true });
		this.orm = MikroORM.init();

		const me = this.bot.getMe();
		const chatAdmins = this.bot.getChatAdministrators(chat);

		this.bot.on('message', async message => {
			const { from, text } = message;
			const myUsername = (await me).username;
			if (text?.startsWith(`@${myUsername}`)) {
				const result = new RegExp(`\\@${myUsername} (.*)`).exec(text);
				if (result) {
					const [, command] = result;

					if (this.commands[command]) {
						await this.commands[command]()
					};
				}
			}
		})

		console.log('performing startup health check...');
		this.healthCheck().then(() => console.log('health check success'), err => {
			console.log('health check failure')
			console.error(err);
			process.exit(1);
		})
	}

	async process() {
		await this.clearPolls();
		await this.createNewPoll();
	}

	private async repoQuery<R>(query: (repo: EntityRepository<DailyCheckIn>) => Promise<R>) {
		const orm = await this.orm;
		const repo: SqlEntityRepository<DailyCheckIn> = orm.em.fork().getRepository(DailyCheckIn);
		console.log('performing query...')
		const response = await query(repo);
		console.log('query success');
		return response;
	}

	private async unpinMessage(message_id: number) {
		console.log('attempting to unpin message');
		await this.bot.unpinChatMessage(this.chat, { message_id } as any)
		console.log('unpin success');
	}

	private async stopPoll(message_id: number) {
		console.log('attempting to stop poll(s)');
		await this.bot.stopPoll(this.chat, message_id).catch((e: Error) => {
			if (e.message.includes('poll has already been closed')) return Promise.resolve();
			else throw e;
		})
		console.log('unpin success');
	}

	private async createNewPoll() {
		console.log('attempting to send new poll');
		const { message_id } = await this.bot.sendPoll(
			this.chat,
			'Daily Check In',
			[
				`\u{1F3CB} strength'd`,
				`\u{1F3C3} cardio'd`,
				`\u{1F966} ate well`,
				`\u{1F6CC} slept well`,
				`\u{1F36B} cheat day`,
				`\u{1F634} rest day`
			],
			{
				is_anonymous: false,
				allows_multiple_answers: true,
				close_date: addDays(Date.now(), 1).getDate()
			}
		);
		console.log('new poll success');
		console.log('attempting to pin new poll');
		await this.bot.pinChatMessage(this.chat, message_id)
		console.log('pin success');
		console.log('attempting to persist new pin to db');
		await this.repoQuery(async r => r.persistAndFlush(r.create({ message_id })))
		console.log('persist success');
	}

	private async clearPolls() {
		await this.repoQuery(async r => {
			const polls = await r.findAll();
			console.log('found polls:', polls);
			return Promise.all(polls.map(async p => {
				await this.stopPoll(p.message_id);
				console.log('successfully stopped poll', p.message_id)
				await this.unpinMessage(p.message_id);
				console.log('successfully unpinned', p.message_id)
				await r.removeAndFlush(p)
				console.log('successfully removed', p.message_id, 'from database')
			}))
		})
	}

	async healthCheck() {
		await this.repoQuery(r => r.createQueryBuilder().raw('SELECT NOW();'))
	}
}

const sylvaInstance = new SylvaBot(CHAT_ID, TOKEN);

const job = new CronJob(
	CRON,
	() => {
		sylvaInstance.process()
	},
	null,
	true,
	'America/New_York'
)

const healthCheckJob = new CronJob(
	'*5 * * * *', // once a minute
	() => {
		sylvaInstance.healthCheck().then(() => console.log('health check ok', (err: any) => console.error('health check failed:', err)))
	},
	null,
	true,
	'America/New_York'
)