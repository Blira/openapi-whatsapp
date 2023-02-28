
class Voice {
  private voiceMap: Map<string, boolean> = new Map([])
  set = (phoneNumber: string) => {
    return this.voiceMap.set(phoneNumber, true)
  }
  get = (phoneNumber: string) => {
    return this.voiceMap.get(phoneNumber)
  }

  delete = (phoneNumber: string) => {
    return this.voiceMap.delete(phoneNumber)
  }
}

export const voice = new Voice()