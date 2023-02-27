import { OpenAIApi } from "openai"

export const getDalleResponse = async ({ clientText, openAi }: { clientText: string, openAi: OpenAIApi }) => {
  const options = {
    prompt: clientText,
    n: 1,
    size: "1024x1024",
  }

  try {
    const response = await openAi.createImage({
      ...options,
      size: '1024x1024'
    })
    return response.data.data[0].url
  } catch (e: any) {
    return `❌ OpenAI Error: ${e.response.data.error.message}`
  }
}