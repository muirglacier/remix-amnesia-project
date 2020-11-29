'use strict'
import { NightwatchBrowser } from "nightwatch"
import init from '../helpers/init'
import sauce from './sauce'

module.exports = {
  before: function (browser: NightwatchBrowser, done: VoidFunction) {
    init(browser, done)
  },

  '@sources': function () {
    return []
  },


  tearDown: sauce
}
