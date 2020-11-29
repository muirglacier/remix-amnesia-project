/* global FileReader */
/* global fetch */
const async = require('async')
const modalDialogCustom = require('../ui/modal-dialog-custom')
const tooltip = require('../ui/tooltip')
const QueryParams = require('../../lib/query-params')
const helper = require('../../lib/helper')
const yo = require('yo-yo')
const Treeview = require('../ui/TreeView')
const modalDialog = require('../ui/modaldialog')
const EventManager = require('../../lib/events')
const contextMenu = require('../ui/contextMenu')
const css = require('./styles/file-explorer-styles')
const globalRegistry = require('../../global/registry')
const queryParams = new QueryParams()
let MENU_HANDLE

function fileExplorer (localRegistry, files, menuItems, plugin) {
  var self = this
  this.events = new EventManager()
  // file provider backend
  this.files = files
  // element currently focused on
  this.focusElement = null
  // path currently focused on
  this.focusPath = null
  const allItems =
    [
      {
        action: 'createNewFile',
        title: 'Create New File',
        icon: 'fas fa-plus'
      },
      
      {
        action: 'uploadFile',
        title: 'Add Local file to the Browser Storage Explorer',
        icon: 'fas fa-folder-open'
      }
      
    ]
  // menu items
  this.menuItems = allItems.filter(
    (item) => {
      if (menuItems) return menuItems.find((name) => { return name === item.action })
    }
  )

  self._components = {}
  self._components.registry = localRegistry || globalRegistry
  self._deps = {
    config: self._components.registry.get('config').api,
    editor: self._components.registry.get('editor').api,
    fileManager: self._components.registry.get('filemanager').api
  }

  self.events.register('focus', function (path) {
    self._deps.fileManager.open(path)
  })

  self._components.registry.put({ api: self, name: `fileexplorer/${self.files.type}` })

  // warn if file changed outside of Remix
  function remixdDialog () {
    return yo`<div>This file has been changed outside of Remix IDE.</div>`
  }

  this.files.event.register('fileExternallyChanged', (path, file) => {
    if (self._deps.config.get('currentFile') === path && self._deps.editor.currentContent() && self._deps.editor.currentContent() !== file.content) {
      if (this.files.isReadOnly(path)) return self._deps.editor.setText(file.content)

      modalDialog(path + ' changed', remixdDialog(),
        {
          label: 'Replace by the new content',
          fn: () => {
            self._deps.editor.setText(file.content)
          }
        },
        {
          label: 'Keep the content displayed in Remix',
          fn: () => {}
        }
      )
    }
  })

  // register to event of the file provider
  files.event.register('fileRemoved', fileRemoved)
  files.event.register('fileRenamed', fileRenamed)
  files.event.register('fileRenamedError', fileRenamedError)
  files.event.register('fileAdded', fileAdded)
  files.event.register('folderAdded', folderAdded)

  function fileRenamedError (error) {
    modalDialogCustom.alert(error)
  }

  function fileAdded (filepath) {
    self.ensureRoot(() => {
      const folderpath = filepath.split('/').slice(0, -1).join('/')
      const currentTree = self.treeView.nodeAt(folderpath)
      if (!self.treeView.isExpanded(folderpath)) self.treeView.expand(folderpath)
      if (currentTree) {
        self.files.resolveDirectory(folderpath, (error, fileTree) => {
          if (error) console.error(error)
          if (!fileTree) return
          fileTree = normalize(folderpath, fileTree)
          self.treeView.updateNodeFromJSON(folderpath, fileTree, true)
          self.focusElement = self.treeView.labelAt(self.focusPath)
          // TODO: here we update the selected file (it applicable)
          // cause we are refreshing the interface of the whole directory when there's a new file.
          if (self.focusElement && !self.focusElement.classList.contains('bg-secondary')) {
            self.focusElement.classList.add('bg-secondary')
          }
        })
      }
    })
  }

  function extractNameFromKey (key) {
    const keyPath = key.split('/')

    return keyPath[keyPath.length - 1]
  }

  function folderAdded (folderpath) {
    self.ensureRoot(() => {
      folderpath = folderpath.split('/').slice(0, -1).join('/')
      self.files.resolveDirectory(folderpath, (error, fileTree) => {
        if (error) console.error(error)
        if (!fileTree) return
        fileTree = normalize(folderpath, fileTree)
        self.treeView.updateNodeFromJSON(folderpath, fileTree, true)
        if (!self.treeView.isExpanded(folderpath)) self.treeView.expand(folderpath)
      })
    })
  }

  function fileRemoved (filepath) {
    const label = self.treeView.labelAt(filepath)
    filepath = filepath.split('/').slice(0, -1).join('/')

    if (label && label.parentElement) {
      label.parentElement.removeChild(label)
    }

    self.updatePath(filepath)
  }

  function fileRenamed (oldName, newName, isFolder) {
    fileRemoved(oldName)
    fileAdded(newName)
  }

  // make interface and register to nodeClick, leafClick
  self.treeView = new Treeview({
    extractData: function extractData (value, tree, key) {
      var newValue = {}
      // var isReadOnly = false
      var isFile = false
      Object.keys(value).filter(function keep (x) {
        if (x === '/content') isFile = true
        if (x[0] !== '/') return true
      }).forEach(function (x) { newValue[x] = value[x] })
      return {
        path: (tree || {}).path ? tree.path + '/' + key : key,
        children: isFile ? undefined
          : value instanceof Array ? value.map((item, index) => ({
            key: index, value: item
          })) : value instanceof Object ? Object.keys(value).map(subkey => ({
            key: subkey, value: value[subkey]
          })) : undefined
      }
    },
    formatSelf: function formatSelf (key, data, li) {
      const isRoot = data.path === self.files.type
      const isFolder = !!data.children
      return yo`
        <div class="${css.items}">
          <span
            title="${data.path}"
            class="${css.label} ${!isRoot ? !isFolder ? css.leaf : css.folder : ''}"
            data-path="${data.path}"
            style="${isRoot ? 'font-weight:bold;' : ''}"
            onkeydown=${editModeOff}
            onblur=${editModeOff}
          >
            ${key.split('/').pop()}
          </span>
          ${isRoot ? self.renderMenuItems() : ''}
        </div>
      `
    }
  })

  /**
   * Extracts first two folders as a subpath from the path.
   **/
  function extractExternalFolder (path) {
    const firstSlIndex = path.indexOf('/', 1)
    if (firstSlIndex === -1) return ''
    const secondSlIndex = path.indexOf('/', firstSlIndex + 1)
    if (secondSlIndex === -1) return ''
    return path.substring(0, secondSlIndex)
  }

  self.treeView.event.register('nodeRightClick', function (key, data, label, event) {
    if (self.files.readonly) return
    if (key === self.files.type) return
    MENU_HANDLE && MENU_HANDLE.hide(null, true)
    const actions = {}
    const provider = self._deps.fileManager.fileProviderOf(key)
    actions['Create File'] = () => self.createNewFile(key)
    actions['Create Folder'] = () => self.createNewFolder(key)
    // @todo(#2386) not fully implemented. Readd later when fixed
    if (provider.isExternalFolder(key)) {
      /* actions['Discard changes'] = () => {
        modalDialogCustom.confirm(
          'Discard changes',
          'Are you sure you want to discard all your changes?',
          () => { self.files.discardChanges(key) },
          () => {}
        )
      } */
    } else {
      const folderPath = extractExternalFolder(key)
      actions.Rename = () => {
        if (self.files.isReadOnly(key)) { return tooltip('cannot rename folder. ' + self.files.type + ' is a read only explorer') }
        var name = label.querySelector('span[data-path="' + key + '"]')
        if (name) editModeOn(name)
      }
      actions.Delete = () => {
        if (self.files.isReadOnly(key)) { return tooltip('cannot delete folder. ' + self.files.type + ' is a read only explorer') }
        const currentFoldername = extractNameFromKey(key)

        modalDialogCustom.confirm('Confirm to delete folder', `Are you sure you want to delete ${currentFoldername} folder?`,
          async () => {
            const fileManager = self._deps.fileManager
            const removeFolder = await fileManager.remove(key)

            if (!removeFolder) {
              tooltip(`failed to remove ${key}. Make sure the directory is empty before removing it.`)
            }
          }, () => {})
      }
 
    }
    MENU_HANDLE = contextMenu(event, actions)
  })

  self.treeView.event.register('leafRightClick', function (key, data, label, event) {
    if (key === self.files.type) return
    MENU_HANDLE && MENU_HANDLE.hide(null, true)
    const actions = {}
    const provider = self._deps.fileManager.fileProviderOf(key)
    if (!provider.isExternalFolder(key)) {
      actions['Create File'] = () => self.createNewFile(self._deps.fileManager.extractPathOf(key))
      actions['Create Folder'] = () => self.createNewFolder(self._deps.fileManager.extractPathOf(key))
      actions.Rename = () => {
        if (self.files.isReadOnly(key)) { return tooltip('cannot rename file. ' + self.files.type + ' is a read only explorer') }
        var name = label.querySelector('span[data-path="' + key + '"]')
        if (name) editModeOn(name)
      }
      actions.Delete = () => {
        if (self.files.isReadOnly(key)) { return tooltip('cannot delete file. ' + self.files.type + ' is a read only explorer') }
        const currentFilename = extractNameFromKey(key)

        modalDialogCustom.confirm(
          'Delete file', `Are you sure you want to delete ${currentFilename} file?`,
          async () => {
            const fileManager = self._deps.fileManager
            const removeFile = await fileManager.remove(key)

            if (!removeFile) {
              tooltip(`Failed to remove file ${key}.`)
            }
          },
          () => {}
        )
      }
      if (key.endsWith('.js')) {
        actions.Run = async () => {
          provider.get(key, (error, content) => {
            if (error) return console.log(error)
            plugin.call('scriptRunner', 'execute', content)
          })
        }
      }
    }
    MENU_HANDLE = contextMenu(event, actions)
  })

  self.treeView.event.register('leafClick', function (key, data, label) {
    self.events.trigger('focus', [key])
  })

  self.treeView.event.register('nodeClick', function (path, childrenContainer) {
    if (!childrenContainer) return
    if (childrenContainer.style.display === 'none') return
    self.updatePath(path)
  })

  // register to main app, trigger when the current file in the editor changed
  self._deps.fileManager.events.on('currentFileChanged', (newFile) => {
    const provider = self._deps.fileManager.fileProviderOf(newFile)
    if (self.focusElement && self.focusPath !== newFile) {
      self.focusElement.classList.remove('bg-secondary')
      self.focusElement = null
      self.focusPath = null
    }
    if (provider && (provider.type === files.type)) {
      self.focusElement = self.treeView.labelAt(newFile)
      if (self.focusElement) {
        self.focusElement.classList.add('bg-secondary')
        self.focusPath = newFile
      }
    }
  })

  self._deps.fileManager.events.on('noFileSelected', () => {
    if (self.focusElement) {
      self.focusElement.classList.remove('bg-secondary')
      self.focusElement = null
      self.focusPath = null
    }
  })

  var textUnderEdit = null

  function selectElementContents (el) {
    var range = document.createRange()
    range.selectNodeContents(el)
    var sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
  }

  function editModeOn (label) {
    textUnderEdit = label.innerText
    label.setAttribute('contenteditable', true)
    label.classList.add('bg-light')
    label.focus()
    selectElementContents(label)
  }

  function editModeOff (event) {
    const label = this

    const isFolder = label.className.indexOf('folder') !== -1
    function rename () {
      var newPath = label.dataset.path
      newPath = newPath.split('/')
      newPath[newPath.length - 1] = label.innerText
      newPath = newPath.join('/')
      if (label.innerText === '') {
        modalDialogCustom.alert('File name cannot be empty')
        label.innerText = textUnderEdit
      } else if (helper.checkSpecialChars(label.innerText)) {
        modalDialogCustom.alert('Special characters are not allowed')
        label.innerText = textUnderEdit
      } else {
        files.exists(newPath, (error, exist) => {
          if (error) return modalDialogCustom.alert('Unexpected error while renaming: ' + error)
          if (!exist) {
            files.rename(label.dataset.path, newPath, isFolder)
          } else {
            modalDialogCustom.alert('File already exists.')
            label.innerText = textUnderEdit
          }
        })
      }
    }

    if (event.which === 13) event.preventDefault()
    if ((event.type === 'blur' || event.which === 13) && label.getAttribute('contenteditable')) {
      var save = textUnderEdit !== label.innerText
      if (save) {
        modalDialogCustom.confirm(
          'Confirm to rename a ' + (isFolder ? 'folder' : 'file'),
          'Are you sure you want to rename ' + textUnderEdit + '?',
          () => { rename() },
          () => { label.innerText = textUnderEdit }
        )
      }
      label.removeAttribute('contenteditable')
      label.classList.remove('bg-light')
    }
  }
}

fileExplorer.prototype.updatePath = function (path) {
  this.files.resolveDirectory(path, (error, fileTree) => {
    if (error) console.error(error)
    if (!fileTree) return
    var newTree = normalize(path, fileTree)
    this.treeView.updateNodeFromJSON(path, newTree, true)
  })
}

fileExplorer.prototype.hide = function () {
  if (this.container) this.container.style.display = 'none'
}

fileExplorer.prototype.show = function () {
  if (this.container) this.container.style.display = 'block'
}

fileExplorer.prototype.init = function () {
  this.container = yo`<div></div>`
  return this.container
}


fileExplorer.prototype.uploadFile = function (event) {
  // TODO The file explorer is merely a view on the current state of
  // the files module. Please ask the user here if they want to overwrite
  // a file and then just use `files.add`. The file explorer will
  // pick that up via the 'fileAdded' event from the files module.

  const self = this

  ;[...event.target.files].forEach((file) => {
    const files = this.files
    function loadFile () {
      var fileReader = new FileReader()
      fileReader.onload = async function (event) {
        if (helper.checkSpecialChars(file.name)) {
          modalDialogCustom.alert('Special characters are not allowed')
          return
        }
        var success = await files.set(name, event.target.result)
        if (!success) {
          modalDialogCustom.alert('Failed to create file ' + name)
        } else {
          self.events.trigger('focus', [name])
        }
      }
      fileReader.readAsText(file)
    }
    var name = files.type + '/' + file.name
    files.exists(name, (error, exist) => {
      if (error) console.log(error)
      if (!exist) {
        loadFile()
      } else {
        modalDialogCustom.confirm('Confirm overwrite', `The file ${name} already exists! Would you like to overwrite it?`, () => { loadFile() })
      }
    })
  })
}


// return all the files, except the temporary/readonly ones..
fileExplorer.prototype.packageFiles = function (filesProvider, directory, callback) {
  const ret = {}
  filesProvider.resolveDirectory(directory, (error, files) => {
    if (error) callback(error)
    else {
      async.eachSeries(Object.keys(files), (path, cb) => {
        if (filesProvider.isDirectory(path)) {
          cb()
        } else {
          filesProvider.get(path, (error, content) => {
            if (error) return cb(error)
            if (/^\s+$/.test(content) || !content.length) {
              content = '// this line is added to create a gist. Empty file is not allowed.'
            }
            ret[path] = { content }
            cb()
          })
        }
      }, (error) => {
        callback(error, ret)
      })
    }
  })
}

fileExplorer.prototype.createNewFile = function (parentFolder = 'browser') {
  const self = this
  modalDialogCustom.prompt('Create new file', 'File Name (e.g Untitled.sol)', 'Untitled.sol', (input) => {
    if (!input) input = 'New file'
    helper.createNonClashingName(parentFolder + '/' + input, self.files, async (error, newName) => {
      if (error) return tooltip('Failed to create file ' + newName + ' ' + error)
      const fileManager = self._deps.fileManager
      const createFile = await fileManager.writeFile(newName, '')

      if (!createFile) {
        tooltip('Failed to create file ' + newName)
      } else {
        await fileManager.open(newName)
        if (newName.includes('_test.sol')) {
          self.events.trigger('newTestFileCreated', [newName])
        }
      }
    })
  }, null, true)
}

fileExplorer.prototype.createNewFolder = function (parentFolder) {
  const self = this
  modalDialogCustom.prompt('Create new folder', '', 'New folder', (input) => {
    if (!input) {
      return tooltip('Failed to create folder. The name can not be empty')
    }

    const currentPath = !parentFolder ? self._deps.fileManager.currentPath() : parentFolder
    let newName = currentPath ? currentPath + '/' + input : self.files.type + '/' + input

    newName = newName + '/'
    self.files.exists(newName, (error, exist) => {
      if (error) return tooltip('Unexpected error while creating folder: ' + error)
      if (!exist) {
        self.files.set(newName, '')
      } else {
        tooltip('Folder already exists.', () => {})
      }
    })
  }, null, true)
}

fileExplorer.prototype.renderMenuItems = function () {
  let items = ''
  if (this.menuItems) {
    items = this.menuItems.map(({ action, title, icon }) => {
      if (action === 'uploadFile') {
        return yo`
          <label
            id=${action}
            data-id="fileExplorerUploadFile${action}"
            class="${icon} mb-0 ${css.newFile}"
            title="${title}"
          >
            <input id="fileUpload" data-id="fileExplorerFileUpload" type="file" onchange=${(event) => {
              event.stopPropagation()
              this.uploadFile(event)
            }} multiple />
          </label>
        `
      } else {
        return yo`
          <span
            id=${action}
            data-id="fileExplorerNewFile${action}"
            onclick=${(event) => { event.stopPropagation(); this[action]() }}
            class="newFile ${icon} ${css.newFile}"
            title=${title}
          >
          </span>
        `
      }
    })
  }
  return yo`<span class=" ${css.menu}">${items}</span>`
}

fileExplorer.prototype.ensureRoot = function (cb) {
  cb = cb || (() => {})
  var self = this
  if (self.element) return cb()
  const root = {}
  root[this.files.type] = {}
  var element = self.treeView.render(root, false)
  element.classList.add(css.fileexplorer)
  element.events = self.events
  element.api = self.api
  self.container.appendChild(element)
  self.element = element
  if (cb) cb()
  self.treeView.expand(self.files.type)
}

function normalize (path, filesList) {
  var prefix = path.split('/')[0]
  var newList = {}
  Object.keys(filesList).forEach(key => {
    newList[prefix + '/' + key] = filesList[key].isDirectory ? {} : { '/content': true }
  })
  return newList
}

module.exports = fileExplorer
