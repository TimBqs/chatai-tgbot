import { Redis } from '@telegraf/session/redis'
import config from 'config'
import { Telegraf, session } from 'telegraf'
import { message } from 'telegraf/filters'
import { code } from 'telegraf/format'
import { ogg } from './ogg.js'
import { openai } from './openai.js'

const store = Redis({
	// this assumes you're using a locally installed Redis daemon running at 6379
	url: 'redis://default:qlsvazilk6@176.57.217.55:6379',
})

// pass the store to session

console.log(config.get('TEST_ENV'))

const INITIAL_SESSION = {
	messages: [],
}

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'))
bot.use(session({ store }))

bot.command('new', async ctx => {
	ctx.session = INITIAL_SESSION
	console.log(ctx.session)
	await ctx.reply('Я ничего не помню... \nЖду вашего нового сообщения!')
})
bot.command('start', async ctx => {
	ctx.session = INITIAL_SESSION

	await ctx.reply('Жду вашего нового сообщения!')
})

bot.on(message('voice'), async ctx => {
	ctx.session ??= INITIAL_SESSION

	try {
		console.log(ctx.session)
		await ctx.reply(code('Сообщение получил, жду ответ от нашего крутого ИИ'))
		const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
		const userId = String(ctx.message.from.id)
		const oggPath = await ogg.create(link, userId)
		const mp3Path = await ogg.toMp3(oggPath, userId)
		const text = await openai.transcription(mp3Path)
		await ctx.reply(code(`Твой запрос: ${text}`))
		ctx.session.messages.push({
			role: openai.roles.USER,
			content: text,
		})
		const response = await openai.chat(ctx.session.messages)
		ctx.session.messages.push({
			role: openai.roles.ASSISTANT,
			content: response.content,
		})
		await ctx.reply(response.content)
	} catch (e) {
		console.log('Error while voice message', e.message)
		ctx.reply('Ошибка')
	}
})

bot.on(message('text'), async ctx => {
	ctx.session ??= INITIAL_SESSION

	try {
		console.log(ctx.session)
		await ctx.reply(code('Сообщение получил, жду ответ от нашего крутого ИИ'))

		ctx.session.messages.push({
			role: openai.roles.USER,
			content: ctx.message.text,
		})
		const response = await openai.chat(ctx.session.messages)
		ctx.session.messages.push({
			role: openai.roles.ASSISTANT,
			content: response.content,
		})
		await ctx.reply(response.content)
	} catch (e) {
		console.log('Error while text message', e.message)
	}
})

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
