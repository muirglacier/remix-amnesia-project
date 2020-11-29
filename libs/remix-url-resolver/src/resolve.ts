import axios, { AxiosResponse } from 'axios'

export interface Imported {
  content: string;
  cleanURL: string;
  type: string;
}

interface PreviouslyHandledImports {
  [filePath: string]: Imported
}

interface Handler {
  type: string;
  match(url: string): any;
  handle(match: any): any;
}

export class RemixURLResolver {
  private previouslyHandled: PreviouslyHandledImports
  constructor() {
    this.previouslyHandled = {}
  }
  /**
  * Handle an import statement based on github
  * @params root The root of the github import statement
  * @params filePath path of the file in github
  */
  async handleGithubCall(root: string, filePath: string) {
    return
  }
  /**
  * Handle an import statement based on http
  * @params url The url of the import statement
  * @params cleanURL
  */
  async handleHttp(url: string, _: string) {
  //eslint-disable-next-line no-useless-catch
    try {
      const response: AxiosResponse = await axios.get(url)
      return response.data
    } catch(e) {
      throw e
    }
  }
  /**
  * Handle an import statement based on https
  * @params url The url of the import statement
  * @params cleanURL
  */
  async handleHttps(url: string, _: string) {
    return
  }
  handleSwarm(url: string, cleanURL: string) {
    return
  }
  /**
  * Handle an import statement based on IPFS
  * @params url The url of the IPFS import statement
  */
  async handleIPFS(url: string) {
    return
  }
  getHandlers(): Handler[] {
    return [
    ]
  }

  public async resolve(filePath: string, customHandlers?: Handler[]): Promise<Imported> {
    return
  }
}
