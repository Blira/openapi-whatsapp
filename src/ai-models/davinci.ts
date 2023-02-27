import { OpenAIApi } from "openai"
import { AiContext } from "../context/context"

export const getDavinciResponse = async ({ openAi, phoneNumber, clientText }: { openAi: OpenAIApi, phoneNumber: any, clientText: any }) => {
  const { prefix, prompt } = await AiContext.getPrompt({ clientText, phoneNumber })
  const options = {
    model: "text-davinci-003",
    prompt: `${prefix} ${prompt}`,
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
    AiContext.update({ parsedApiTextResponse, phoneNumber, prompt })
    console.log('FINAL CONTEXT --> ', AiContext.get(phoneNumber))
    return parsedApiTextResponse
  } catch (e: any) {
    return `❌ openAi Response Error: ${e.response.data.error.message}`
  }
}