import { create } from 'venom-bot'
import * as dotenv from 'dotenv'
import { Configuration, OpenAIApi } from "openai"

dotenv.config()

const contextMap = new Map([
    // ['558197298151@c.us', `Human:Tell me one famous person's name\nAI:Dwayne Johnson\nHuman:A brazilian one\nAI:Fernando Torres\nHuman:A cuban one\nAI:Celia Cruz\nHuman:A Chinese one\nAI:Jackie Chan`]
])

create({
    session: 'Open-Ai',
    multidevice: true
})
    .then((client) => start(client))
    .catch((erro) => {
        console.log(erro);
    });

const configuration = new Configuration({
    organization: process.env.ORGANIZATION_ID,
    apiKey: process.env.OPENAI_KEY,
});

const openai = new OpenAIApi(configuration);

const getDavinciResponse = async (phoneNumber, clientText) => {
    const messageSize = String(clientText).length;
    if (messageSize > 1000) {
        return `❌ ChatBot Response Error: Your message should contain less than 1000 characters. (${messageSize})`
    }
    const parsedClientText = clientText;
    const contextWithClientText = `${contextMap.get(phoneNumber) || ""}${parsedClientText}`
    const options = {
        model: "text-davinci-003",
        prompt: contextWithClientText,
        temperature: 1,
        max_tokens: 3000,
        // stop: [" Human:", " AI:"],
    }

    try {
        const response = await openai.createCompletion(options)
        let apiTextResponse = ""
        console.log(response.data)
        response.data.choices.forEach(({ text }) => {
            apiTextResponse += text
        })
        const parsedApiTextResponse = `${apiTextResponse.trim()}`
        const newContext = `${contextWithClientText}${parsedApiTextResponse}`
        contextMap.set(phoneNumber, newContext)
        console.log('FINAL CONTEXT --> ', contextMap.get(phoneNumber));
        return parsedApiTextResponse;
    } catch (e) {
        return `❌ OpenAI Response Error: ${e.response.data.error.message}`
    }
}

const getDalleResponse = async (clientText) => {
    const options = {
        prompt: clientText,
        n: 1,
        size: "1024x1024",
    }

    try {
        const response = await openai.createImage(options);
        return response.data.data[0].url
    } catch (e) {
        return `❌ OpenAI Response Error: ${e.response.data.error.message}`
    }
}

const commands = (client, message) => {
    const iaCommands = {
        davinci3: "/bot",
        dalle: "/img",
        clearContex: "/cc"
    }

    let firstWord = message.text.substring(0, message.text.indexOf(" "));
    const phoneNumber = message.from === process.env.PHONE_NUMBER ? message.to : message.from;
    switch (firstWord) {

        case iaCommands.davinci3:
            contextMap.delete(phoneNumber);
            client.sendText(phoneNumber, 'Context deleted :)');
            break;

        case iaCommands.davinci3:
            const question = message.text.substring(message.text.indexOf(" "));
            getDavinciResponse(phoneNumber, question).then((response) => {
                client.sendText(phoneNumber, response)
            })
            break;

        case iaCommands.dalle:
            const imgDescription = message.text.substring(message.text.indexOf(" "));
            getDalleResponse(imgDescription, message).then((imgUrl) => {
                client.sendImage(
                    phoneNumber,
                    imgUrl,
                    imgDescription,
                    'Imagem gerada pela IA DALL-E 🤖'
                )
            })
            break;
    }
}

async function start(client) {
    client.onAnyMessage((message) => commands(client, message));
}
