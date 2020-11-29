import * as packageJson from '../../../../../../package.json'
import { ViewPlugin } from '@remixproject/engine-web'

const yo = require('yo-yo')
const csjs = require('csjs-inject')
const globalRegistry = require('../../../global/registry')
const CompilerImport = require('../../compiler/compiler-imports')
var modalDialogCustom = require('../modal-dialog-custom')
var tooltip = require('../tooltip')
var GistHandler = require('../../../lib/gist-handler')
var QueryParams = require('../../../lib/query-params.js')

const css = csjs`
  
  .text {
    cursor: pointer;
    font-weight: normal;
    max-width: 300px;
    user-select: none;
  }
  .text:hover {
    text-decoration: underline;
  }
  .homeContainer {
    user-select: none;
    overflow-y: hidden;
  }
  .mainContent {
    overflow-y: auto;
    flex-grow: 3;
  }
  .hpLogoContainer {
    margin: 30px;
    padding-right: 90px;
  }
  .mediaBadge {
   font-size: 2em;
   height: 2em;
   width: 2em;
  }
  .mediaBadge:focus {
    outline: none;
  }
  .logoImg {
    height: 10em;
  }
  .hpSections {
  }
  .rightPanel {
    right: 0;
    position: absolute;
    z-index: 3;
  }
  .remixHomeMedia {
    overflow-y: auto;
    overflow-x: hidden;
    max-height: 720px;
  }
  .panels {
    box-shadow: 0px 0px 17px -7px;
  }
  .labelIt {
    margin-bottom: 0;
  }
  .bigLabelSize {
    font-size: 13px;
  }
  .seeAll {
    margin-top: 7px;
    white-space: nowrap;
  }
  .importFrom p {
    margin-right: 10px;
  }
  .logoContainer img{
    height: 150px;
    opacity: 0.7;
  }
  .envLogo {
    height: 16px;
  }
  .cursorStyle {
    cursor: pointer;
  }
  .envButton {
    width: 120px;
    height: 70px;
  }
  .media {
    overflow: hidden;
    width: 400px;
    transition: .5s ease-out;
    z-index: 1000;
  }
}
`

const profile = {
  name: 'home',
  displayName: 'Home',
  methods: [],
  events: [],
  description: ' - ',
  icon: 'assets/img/icon.png',
  location: 'mainPanel',
  version: packageJson.version
}

export class LandingPage extends ViewPlugin {
  constructor (appManager, verticalIcons) {
    super(profile)
    this.profile = profile
    this.appManager = appManager
    this.verticalIcons = verticalIcons
    this.gistHandler = new GistHandler()
    const themeQuality = globalRegistry.get('themeModule').api.currentTheme().quality
    window.addEventListener('resize', () => this.adjustMediaPanel())
    window.addEventListener('click', (e) => this.hideMediaPanel(e))
    
   
    this.adjustMediaPanel()
    globalRegistry.get('themeModule').api.events.on('themeChanged', (theme) => {
      this.onThemeChanged(theme.quality)
    })
  }

  adjustMediaPanel () {
    
  }

  hideMediaPanel (e) {
    const mediaPanelsTitle = document.getElementById('remixIDEMediaPanelsTitle')
    const mediaPanels = document.getElementById('remixIDEMediaPanels')
    if (!mediaPanelsTitle || !mediaPanels) return
    if (!mediaPanelsTitle.contains(e.target) && !mediaPanels.contains(e.target)) {
     
    }
  }

  onThemeChanged (themeQuality) {
   
  }

  showMediaPanel (e) {
    
  }

  render () {
    const load = (service, item, examples, info) => {
      const compilerImport = new CompilerImport()
      const fileProviders = globalRegistry.get('fileproviders').api
      const msg = yo`
        <div class="p-2">
          <span>Enter the ${item} you would like to load.</span>
          <div>${info}</div>
          <div>e.g ${examples.map((url) => { return yo`<div class="p-1"><a>${url}</a></div>` })}</div>
        </div>`

      modalDialogCustom.prompt(`Import from ${service}`, msg, null, (target) => {
        if (target !== '') {
          compilerImport.import(
            target,
            (loadingMsg) => { tooltip(loadingMsg) },
            (error, content, cleanUrl, type, url) => {
              if (error) {
                modalDialogCustom.alert(error)
              } else {
                fileProviders.browser.addExternal(type + '/' + cleanUrl, content, url)
                this.verticalIcons.select('fileExplorers')
              }
            }
          )
        }
      })
    }

    const startSolidity = () => {
      this.appManager.ensureActivated('solidity')
      this.appManager.ensureActivated('udapp')
      this.appManager.ensureActivated('solidityStaticAnalysis')
      this.appManager.ensureActivated('solidityUnitTesting')
      this.verticalIcons.select('solidity')
    }
    /*
    const startWorkshop = () => {
      this.appManager.ensureActivated('box')
      this.appManager.ensureActivated('solidity')
      this.appManager.ensureActivated('solidityUnitTesting')
      this.appManager.ensureActivated('workshops')
      this.verticalIcons.select('workshops')
    }
    */

    const startPipeline = () => {
      this.appManager.ensureActivated('solidity')
      this.appManager.ensureActivated('pipeline')
      this.appManager.ensureActivated('udapp')
    }
    const startDebugger = () => {
      this.appManager.ensureActivated('debugger')
      this.verticalIcons.select('debugger')
    }
    const startMythX = () => {
      this.appManager.ensureActivated('solidity')
      this.appManager.ensureActivated('mythx')
      this.verticalIcons.select('mythx')
    }
    const startSourceVerify = () => {
      this.appManager.ensureActivated('solidity')
      this.appManager.ensureActivated('source-verification')
      this.verticalIcons.select('source-verification')
    }
    const startPluginManager = () => {
      this.appManager.ensureActivated('pluginManager')
      this.verticalIcons.select('pluginManager')
    }

    const createNewFile = () => {
      const fileExplorer = globalRegistry.get('fileexplorer/browser').api
      fileExplorer.createNewFile()
    }
    const connectToLocalhost = () => {
      this.appManager.ensureActivated('remixd')
    }
    const importFromGist = () => {
      this.gistHandler.loadFromGist({ gist: '' }, globalRegistry.get('filemanager').api)
      this.verticalIcons.select('fileExplorers')
    }

    globalRegistry.get('themeModule').api.events.on('themeChanged', (theme) => {
      globalRegistry.get('themeModule').api.fixInvert(document.getElementById('remixLogo'))
      globalRegistry.get('themeModule').api.fixInvert(document.getElementById('solidityLogo'))
      globalRegistry.get('themeModule').api.fixInvert(document.getElementById('pipelineLogo'))
      globalRegistry.get('themeModule').api.fixInvert(document.getElementById('debuggerLogo'))
      globalRegistry.get('themeModule').api.fixInvert(document.getElementById('workshopLogo'))
      globalRegistry.get('themeModule').api.fixInvert(document.getElementById('moreLogo'))
    })

    const createLargeButton = (imgPath, envID, envText, callback) => {
      return yo`
        <button
          class="btn border-secondary d-flex mr-3 text-nowrap justify-content-center flex-column align-items-center ${css.envButton}"
          data-id="landingPageStartSolidity"
          onclick=${() => callback()}
        >
          <img class="m-2 align-self-center ${css.envLogo}" id=${envID} src="${imgPath}">
          <label class="text-uppercase text-dark ${css.cursorStyle}">${envText}</label>
        </button>
      `
    }

    // main
    const solEnv = createLargeButton('assets/img/solidityLogo.webp', 'solidityLogo', 'Solidity', startSolidity)
    // Featured
    const pipelineEnv = createLargeButton('assets/img/pipelineLogo.webp', 'pipelineLogo', 'Pipeline', startPipeline)
    const debuggerEnv = createLargeButton('assets/img/debuggerLogo.webp', 'debuggerLogo', 'Debugger', startDebugger)
    const mythXEnv = createLargeButton('assets/img/mythxLogo.webp', 'mythxLogo', 'MythX', startMythX)
    const sourceVerifyEnv = createLargeButton('assets/img/sourceVerifyLogo.webp', 'sourceVerifyLogo', 'Sourcify', startSourceVerify)
    const moreEnv = createLargeButton('assets/img/moreLogo.webp', 'moreLogo', 'More', startPluginManager)

    const themeQuality = globalRegistry.get('themeModule').api.currentTheme().quality
    const invertNum = (themeQuality === 'dark') ? 1 : 0
    solEnv.getElementsByTagName('img')[0].style.filter = `invert(${invertNum})`
    pipelineEnv.getElementsByTagName('img')[0].style.filter = `invert(${invertNum})`
    debuggerEnv.getElementsByTagName('img')[0].style.filter = `invert(${invertNum})`
    mythXEnv.getElementsByTagName('img')[0].style.filter = `invert(${invertNum})`
    sourceVerifyEnv.getElementsByTagName('img')[0].style.filter = `invert(${invertNum})`
    moreEnv.getElementsByTagName('img')[0].style.filter = `invert(${invertNum})`

    const switchToPreviousVersion = () => {
      const query = new QueryParams()
      query.update({ appVersion: '0.7.7' })
      document.location.reload()
    }
    const img = yo`<img class=${css.logoImg} src="assets/img/guitarRemiCroped.webp" onclick="${() => playRemi()}"></img>`
    const playRemi = async () => { await document.getElementById('remiAudio').play() }
    
    const container = yo`
      <div class="${css.homeContainer} d-flex" data-id="landingPageHomeContainer">
        <div class="${css.mainContent} bg-light">
          <div class="d-flex justify-content-between">
            <div class="d-flex flex-column" style="width: 100%; text-align: center; padding-top: 200px">
              <img src="assets/img/icon.png" style="width: 200px; display: block;
              margin-left: auto;
              margin-right: auto; filter: invert(1);">
              <h1 style="text-align: center; padding-top: 20px">Don't Worry, Mark is None The Wiser!</h1>              
            </div>
            <div class="d-flex flex-column ${css.rightPanel}">
              <div class="d-flex pr-2 py-2 align-self-end"  id="remixIDEMediaPanelsTitle">
         
              </div>
              <div class="mr-3 d-flex bg-light ${css.panels}" id="remixIDEMediaPanels">
    
              </div>
            </div>
          </div>
        </div>
      </div>
    `
    return container
  }
}
