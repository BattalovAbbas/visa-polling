const TelegramBot = require('node-telegram-bot-api');
const request = require('request');

const telegramToken = process.env.TELEGRAM;
const authToken = process.env.AUTH;

let bot;
if (process.env.NODE_ENV === 'production') {
  const port = process.env.PORT || 443;
  const url = process.env.CUSTOM_ENV_VARIABLE || '0.0.0.0';
  bot = new TelegramBot(telegramToken, { webHook: { port, url } });
  bot.setWebHook(url + ':' + port + '/bot' + telegramToken);
} else {
  bot = new TelegramBot(telegramToken, { polling: true });
}

bot.onText(/\/start/, async (msg, match) => {
    const chatId = msg.chat.id;
    const mount = Number(match.input.replace('/start ', ''));
    const stringMount = `${mount}`.padStart(2, '0');
    const options = {
        url: `https://ru.almaviva-visa.services/api/sites/disabled-dates/?start=01/${stringMount}/2023&end=31/${stringMount}/2023&siteId=14&persons=1`,
        headers: {
            'Authorization': authToken,
            'Accept': 'application/json, text/plain, */*',
        }
    }
    const callback = (error, response, body) => {
        if (!error && response.statusCode == 200) {
            const array = JSON.parse(body);
            const disabledDates = array.map(item => item.date);
            const allDates = getAllDates(mount);
            const availableDates = allDates.filter(date => !disabledDates.includes(date));
            if (availableDates.length) {
                bot.sendMessage(chatId, availableDates.join(', '));
            } else {
                bot.sendMessage(chatId, 'Empty');
            }
        } else {
            bot.sendMessage(chatId, error);
            console.log(error);
        }
    }
    request(options, callback);
});

function getAllDates(month) {
    const year = '2023';
	const day = new Date(year, month + 1, 0);
	const lastDay = day.getDate();
	const dateList = [];
	for (let day = 1; day <= lastDay; day++) {
        const newDate = new Date(year, month, day);
		dateList.push(`${newDate.getFullYear()}-${newDate.getMonth().toString().padStart(2, '0')}-${newDate.getDate().toString().padStart(2, '0')}`);
	}
	return dateList;
}
