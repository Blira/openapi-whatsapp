import { create } from 'venom-bot'
import * as dotenv from 'dotenv'
import { Configuration, OpenAIApi } from "openai"

dotenv.config()

const defaultContext = 
`Você é a ISA, uma inteligência artificial criada para auxiliar o fluxo de vendas. Você responde apenas a conversa dentro de um contexto de vendas. Você sempre tenta utilizar os seguintes dados como fonte para suas resposta: {"code":"600","name":"THIAGO OLIVEIRA CARVALHO PIMENTEL","accomplished":226678.82,"goal":850840,"projection":453357.64,"forecast":806794.34,"clients":[{"code":"153850","name":"JOSE PAULO SANTOS PNEUS","potential":21527.89,"longitude":-36.4871,"latitude":-8.8821691,"forecast":31093.3},{"code":"161028","name":"SOLUCAO COM DE PECAS E ACESSORIOS PARA","potential":19949.83,"longitude":-36.4863816,"latitude":-8.881068,"forecast":14931.68},{"code":"157150","name":"R O VALENCA GENU EIRELI ME","potential":19375.04,"longitude":-36.6978481,"latitude":-8.3570686,"forecast":15955.38}],"dashboard":"https://metabase.n3urons.com/public/dashboard/6cd3265e-ffc5-4d27-b1e1-8891959a2a05?tenant=623b6ab120f7e70949d06250&users=600&dates=2023-02-01~2023-02-28&status=billed"}
Human: Oi, quem é você?\n
ISA: Meu nome é ISA, como posso te ajudar?\n`

const contextMap = new Map([])

create({
    session: `${process.env.SESSION || 'Local-AI'}`,
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
    const parsedClientText = `${clientText}\nISA:`
    const contextWithClientText = `${contextMap.get(phoneNumber) || defaultContext + "\nHuman: "}${parsedClientText}`
    const options = {
        model: "text-davinci-003",
        prompt: contextWithClientText,
        temperature: 1,
        max_tokens: 1024,
        stop: [" Human:", " ISA:"],
    }

    try {
        const response = await openai.createCompletion(options)
        let apiTextResponse = ""
        response.data.choices.forEach(({ text }) => {
            apiTextResponse += text
        })
        const parsedApiTextResponse = `${apiTextResponse.trim()}`
        const newContext = `${contextWithClientText}${parsedApiTextResponse}\nHuman: `
        contextMap.set(phoneNumber, newContext)
        console.log('FINAL CONTEXT --> ', contextMap.get(phoneNumber))
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
        return `❌ OpenAI Error: ${e.response.data.error.message}`
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
        getDalleResponse(imgDescription).then((imgUrl) => {
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
        client.sendText(phoneNumber, response).then(() =>
            console.log(`SENT TO ${phoneNumber}: ${response}`)
        )
    })
}

async function start(client) {
    client.onMessage(async (message) => {
        console.log(`${message.notifyName}: ${message.text}`)
        if (message.type === 'chat' && !message.isGroup) {
            commands(client, message)
        }
    })
}
