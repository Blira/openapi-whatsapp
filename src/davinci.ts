import { OpenAIApi } from "openai"
import { defaultContext } from "./default-context"



export const getDavinciResponse = async ({ openAi, phoneNumber, clientText, contextMap }: { openAi: OpenAIApi, phoneNumber: any, clientText: any, contextMap: Map<string, string> }) => {
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
    const response = await openAi.createCompletion(options)
    let apiTextResponse = ""
    response.data.choices.forEach(({ text }) => {
      apiTextResponse += text
    })
    const parsedApiTextResponse = `${apiTextResponse.trim()}`
    const newContext = `${contextWithClientText}${parsedApiTextResponse}\nHuman: `
    contextMap.set(phoneNumber, newContext)
    console.log('FINAL CONTEXT --> ', contextMap.get(phoneNumber))
    return parsedApiTextResponse
  } catch (e: any) {
    return `❌ openAi Response Error: ${e.response.data.error.message}`
  }
}