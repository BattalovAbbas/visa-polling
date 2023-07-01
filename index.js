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

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const sitesOptions = {
        url: 'https://ru.almaviva-visa.services/api/sites/',
        headers: {
            'Authorization': authToken,
            'Accept': 'application/json, text/plain, */*',
        }
    }
    const promise = (city, month, callback) => {
        const stringmonth = `${month}`.padStart(2, '0');
        const options = {
            url: `https://ru.almaviva-visa.services/api/sites/disabled-dates/?start=01/${stringmonth}/2023&end=31/${stringmonth}/2023&siteId=${city.id}&persons=1`,
            headers: {
                'Authorization': authToken,
                'Accept': 'application/json, text/plain, */*',
            }
        }
        request(options, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                const array = JSON.parse(body);
                const disabledDates = array.map(item => item.date);
                const allDates = getAllDates(month);
                const availableDates = allDates.filter(date => !disabledDates.includes(date));
                callback({ city, month, availableDates });
            }
        });
    };
    const cities = [];
    request(sitesOptions, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            const array = JSON.parse(body);
            array.forEach(element => {
                if (element.id !== 0) {
                    cities.push(element);
                } 
            });
            const months = [7,8];
            cities.forEach(city => {
                months.forEach(month => {
                    promise(city, month, (data) => {
                        console.log(`${data.city.name}: ${data.availableDates.join(', ')}`);
                        bot.sendMessage(chatId, `${data.city.name} ${month}: ${data.availableDates.join(', ')}`);
                    });
                })
            });
        } else {
            bot.sendMessage(chatId, 'Ошибка запроса');
            console.log(error);
        }
    });
});

function getAllDates(month) {
    const year = '2023';
	const day = new Date(year, month + 1, 0);
	const lastDay = day.getDate();
	const dateList = [];
    const current = (new Date()).getDate();
	for (let day = current; day <= lastDay; day++) {
        const newDate = new Date(year, month, day);
		dateList.push(`${newDate.getFullYear()}-${newDate.getMonth().toString().padStart(2, '0')}-${newDate.getDate().toString().padStart(2, '0')}`);
	}
	return dateList;
}
