import { create } from 'venom-bot'
import * as dotenv from 'dotenv'
import { Configuration, OpenAIApi } from "openai"

dotenv.config()

const defaultContext = `The following is a conversation with an AI assistant. The assistant is helpful, creative, clever, and very friendly.\n\nHuman: Hello, who are you?\nAI: I am an AI created by OpenAI. How can I help you today?\nHuman: {"vendedor":"andre","vendas":[{"data":"2023-02-01","valor":1200.87},{"data":"2023-02-02","valor":1056.87},{"data":"2023-02-03","valor":1302.87},{"data":"2023-02-04","valor":985.87},{"data":"2023-02-05","valor":1116.87},{"data":"2023-02-06","valor":1250.87},{"data":"2023-02-07","valor":1165.87}],"meta":117983.36,"previsão":456300.11,"clientes":[{"código":"132811","previsao":69517.15,"produtos":[{"descrição":"produto A","quantidade":12},{"descrição":"produto B","quantidade":8},{"descrição":"produto C","quantidade":14}]},{"código":"217974","previsao":62276.46,"produtos":[{"descrição":"produto D","quantidade":13},{"descrição":"produto E","quantidade":18},{"descrição":"produto F","quantidade":5}]},{"código":"210639","previsao":45229.63,"produtos":[{"descrição":"produto G","quantidade":6},{"descrição":"produto H","quantidade":9},{"descrição":"produto I","quantidade":8}]}]}`

const contextMap = new Map([])

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
    const parsedClientText = `${clientText}\nAI:`;
    const contextWithClientText = `${contextMap.get(phoneNumber) || defaultContext}${parsedClientText}`
    const options = {
        model: "text-davinci-003",
        prompt: contextWithClientText,
        temperature: 1,
        max_tokens: 1024,
        stop: [" Human:", " AI:"],
    }

    try {
        const response = await openai.createCompletion(options)
        let apiTextResponse = ""
        console.log(response.data)
        response.data.choices.forEach(({ text }) => {
            apiTextResponse += text
        })
        const parsedApiTextResponse = `${apiTextResponse.trim()}`
        const newContext = `${contextWithClientText}${parsedApiTextResponse}\nHuman: `
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
        case iaCommands.clearContex:
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

        // default:
        //     const question = message.text;
        //     getDavinciResponse(phoneNumber, question).then((response) => {
        //         client.sendText(phoneNumber, response)
        //     })
        //     break;
    }
}

async function start(client) {
    client.onAnyMessage((message) => commands(client, message));
}
