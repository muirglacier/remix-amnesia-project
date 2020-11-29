'use strict'
var yo = require('yo-yo')
var async = require('async')
var EventManager = require('../lib/events')

var CompilerImport = require('../app/compiler/compiler-imports')
var toolTip = require('../app/ui/tooltip')
var globalRegistry = require('../global/registry')
var SourceHighlighter = require('../app/editor/sourceHighlighter')
var GistHandler = require('./gist-handler')

class CmdInterpreterAPI {
  constructor (terminal, localRegistry, blockchain) {
    const self = this
    self.event = new EventManager()
    self.blockchain = blockchain
    self._components = {}
    self._components.registry = localRegistry || globalRegistry
    self._components.terminal = terminal
    self._components.sourceHighlighter = new SourceHighlighter()
    self._components.fileImport = new CompilerImport()
    self._components.gistHandler = new GistHandler()
    self._deps = {
      fileManager: self._components.registry.get('filemanager').api,
      editor: self._components.registry.get('editor').api,
      compilersArtefacts: self._components.registry.get('compilersartefacts').api,
      offsetToLineColumnConverter: self._components.registry.get('offsettolinecolumnconverter').api
    }
    self.commandHelp = {
      'remix.execute(filepath)': 'Run the script specified by file path. If filepath is empty, script currently displayed in the editor is executed.',
      'remix.exeCurrent()': 'Run the script currently displayed in the editor',
      'remix.help()': 'Display this help message'
    }
  }

  log () { arguments[0] != null ? this._components.terminal.commands.html(arguments[0]) : this._components.terminal.commands.html(arguments[1]) }
  
  exeCurrent (cb) {
    return this.execute(undefined, cb)
  }

  execute (file, cb) {
    const self = this

    function _execute (content, cb) {
      if (!content) {
        toolTip('no content to execute')
        if (cb) cb()
        return
      }

      self._components.terminal.commands.script(content)
    }

    if (typeof file === 'undefined') {
      var content = self._deps.editor.currentContent()
      _execute(content, cb)
      return
    }

    var provider = self._deps.fileManager.fileProviderOf(file)

    if (!provider) {
      toolTip(`provider for path ${file} not found`)
      if (cb) cb()
      return
    }

    provider.get(file, (error, content) => {
      if (error) {
        toolTip(error)
        if (cb) cb()
        return
      }

      _execute(content, cb)
    })
  }

  help (cb) {
    const self = this
    var help = yo`<div></div>`
    for (var k in self.commandHelp) {
      help.appendChild(yo`<div>${k}: ${self.commandHelp[k]}</div>`)
      help.appendChild(yo`<br>`)
    }
    self._components.terminal.commands.html(help)
    if (cb) cb()
    return ''
  }
}

module.exports = CmdInterpreterAPI
