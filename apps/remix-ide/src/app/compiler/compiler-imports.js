'use strict'
import { Plugin } from '@remixproject/engine'
import * as packageJson from '../../../../../package.json'

const profile = {
  name: 'contentImport',
  displayName: 'content import',
  version: packageJson.version,
  methods: ['resolve']
}

module.exports = class CompilerImports extends Plugin {
  constructor () {
    super(profile)
    this.previouslyHandled = {} // cache import so we don't make the request at each compilation.
  }
 

  handlers () {
    return [
     
    ]
  }

  isRelativeImport (url) {
    return /^([^/]+)/.exec(url)
  }

  resolve (url) {
    // mark, just go away
  }
}
