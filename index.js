import { create } from 'venom-bot'
import * as dotenv from 'dotenv'
import { Configuration, OpenAIApi } from "openai"

dotenv.config()

const defaultContext = `Human: Oi, quem é você?\nISA: Meu nome é ISA, como posso te ajudar?\nHuman: {"vendedor":"andre","vendas":[{"data":"2023-02-01","valor":1200.87},{"data":"2023-02-02","valor":1056.87},{"data":"2023-02-03","valor":1302.87},{"data":"2023-02-04","valor":985.87},{"data":"2023-02-05","valor":1116.87},{"data":"2023-02-06","valor":1250.87},{"data":"2023-02-07","valor":1165.87}],"meta":117983.36,"previsão":456300.11,"clientes":[{"código":"client A","longitude":-47.0416222,"latitude":-22.852148,"previsao":69517.15,"produtos":[{"descrição":"produto A","quantidade":12},{"descrição":"produto B","quantidade":8},{"descrição":"produto C","quantidade":14}]},{"código":"client B","longitude":-47.2466556,"latitude":-22.9138431,"previsao":62276.46,"produtos":[{"descrição":"produto D","quantidade":13},{"descrição":"produto E","quantidade":18},{"descrição":"produto F","quantidade":5}]},{"código":"client C","longitude":-46.8024438,"latitude":-21.9772814,"previsao":45229.63,"produtos":[{"descrição":"produto G","quantidade":6},{"descrição":"produto H","quantidade":9},{"descrição":"produto I","quantidade":8}]}],"detalhes":"https://metabase.n3urons.com/public/dashboard/6cd3265e-ffc5-4d27-b1e1-8891959a2a05"}`

const contextMap = new Map([])

create({
    session: 'Open-Ai',
    multidevice: true
})
    .then((client) => start(client))
    .catch((erro) => {
        console.log(erro)
    })

const configuration = new Configuration({
    organization: process.env.ORGANIZATION_ID,
    apiKey: process.env.OPENAI_KEY,
})

const openai = new OpenAIApi(configuration)

const getDavinciResponse = async (phoneNumber, clientText) => {
    console.log(1)
    const parsedClientText = `${clientText}\nISA:`
    console.log(2)
    const contextWithClientText = `${contextMap.get(phoneNumber) || defaultContext + "\nHuman: "}${parsedClientText}`
    console.log(3)
    const options = {
        model: "text-davinci-003",
        prompt: contextWithClientText,
        temperature: 1,
        max_tokens: 1024,
        stop: [" Human:", " ISA:"],
    }

    console.log(4)
    try {
        console.log(5)
        const response = await openai.createCompletion(options)
        console.log(6)
        let apiTextResponse = ""
        console.log(7)
        console.log(response.data)
        console.log(8)
        response.data.choices.forEach(({ text }) => {
            apiTextResponse += text
        })
        console.log(9)
        const parsedApiTextResponse = `${apiTextResponse.trim()}`
        console.log(1)
        const newContext = `${contextWithClientText}${parsedApiTextResponse}\nHuman: `
        console.log(2)
        contextMap.set(phoneNumber, newContext)
        console.log(3)
        console.log('FINAL CONTEXT --> ', contextMap.get(phoneNumber))
        console.log(4)
        return parsedApiTextResponse
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
        const response = await openai.createImage(options)
        return response.data.data[0].url
    } catch (e) {
        return `❌ OpenAI Response Error: ${e.response.data.error.message}`
    }
}

const commands = (client, message) => {
    const phoneNumber = message.from
    if (message.text === '/cc') {
        contextMap.delete(phoneNumber)
        client.sendText(phoneNumber, 'Context deleted :)')
        return
    }
    else if (message.text.substring(0, 5) === '/img ') {
        console.log('IMAGEM')
        const imgDescription = message.text.substring(5)
        console.log('DESC: ', imgDescription)
        getDalleResponse(imgDescription, message).then((imgUrl) => {
            console.log('GENERATED')
            client.sendImage(
                phoneNumber,
                imgUrl,
                imgDescription,
            )
            console.log('SENT')
        })
        return
    }

    getDavinciResponse(phoneNumber, message.text).then((response) => {

        console.log(11)
        client.sendText(phoneNumber, response).then(() =>

            console.log(99)
        )
    })

    // const iaCommands = {
    //     davinci3: "/bot",
    //     dalle: "/img",
    //     clearContex: "/cc"
    // }

    // let firstWord = message.text.substring(0, message.text.indexOf(" "))
    // // const phoneNumber = message.from === process.env.PHONE_NUMBER ? message.to : message.from
    // const phoneNumber = message.from
    // switch (firstWord) {
    //     case iaCommands.clearContex:
    //         contextMap.delete(phoneNumber)
    //         client.sendText(phoneNumber, 'Context deleted :)')
    //         break

    //     case iaCommands.davinci3:
    //         const question = message.text.substring(message.text.indexOf(" "))
    //         getDavinciResponse(phoneNumber, question).then((response) => {
    //             client.sendText(phoneNumber, response)
    //         })
    //         break

    //     case iaCommands.dalle:
    //         const imgDescription = message.text.substring(message.text.indexOf(" "))
    //         getDalleResponse(imgDescription, message).then((imgUrl) => {
    //             client.sendImage(
    //                 phoneNumber,
    //                 imgUrl,
    //                 imgDescription,
    //                 'Imagem gerada pela IA DALL-E 🤖'
    //             )
    //         })
    //         break

    //     // default:
    //     //     const q = message.text
    //     //     getDavinciResponse(phoneNumber, q).then((response) => {
    //     //         client.sendText(phoneNumber, response)
    //     //     })
    //     //     break
    // }
}

async function start(client) {
    client.onMessage((message) => {
        console.log(message)
        //message.from === '558197929828@c.us' && 
        if (message.type === 'chat' && !message.isGroup) {
            console.log('OK')
            commands(client, message)
        }
    })
}
