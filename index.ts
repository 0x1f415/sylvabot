import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { addDays } from 'date-fns';
import { MikroORM } from '@mikro-orm/core';
import { EntityRepository, SqlEntityRepository } from '@mikro-orm/postgresql';
import { DailyCheckIn } from './entities/DailyCheckIn.entity';
import cron from 'node-cron';

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
	constructor(private readonly chat: string, token: string) {
		this.bot = new TelegramBot(token, { polling: true });
	}

	async process() {
		await this.clearPolls();
		await this.createNewPoll();
	}

	private async repoQuery<R>(query: (repo: EntityRepository<DailyCheckIn>) => Promise<R>) {
		const orm = await MikroORM.init();
		const repo: SqlEntityRepository<DailyCheckIn> = orm.em.fork().getRepository(DailyCheckIn);
		const response = await query(repo);
		await orm.close();
		return response;
	}

	private async unpinMessage(message_id: number) {
		return this.bot.unpinChatMessage(this.chat, { message_id } as any)
	}

	private async stopPoll(message_id: number) {
		return this.bot.stopPoll(this.chat, message_id).catch((e: Error) => {
			if (e.message.includes('poll has already been closed')) return Promise.resolve();
			else throw e;
		})
	}

	private async createNewPoll() {
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
		await this.bot.pinChatMessage(this.chat, message_id)
		await this.repoQuery(async r => r.persistAndFlush(r.create({ message_id })))
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
}

const sylvaInstance = new SylvaBot(CHAT_ID, TOKEN);

cron.schedule(CRON, () => {
	sylvaInstance.process()
})