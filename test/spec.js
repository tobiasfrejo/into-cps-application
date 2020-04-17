const Application = require('spectron').Application
const assert = require('assert')
const expect = require('chai').expect;
const electronPath = require('electron') // Require Electron from the binaries included in node_modules.
const path = require('path')
const fakeMenu = require('spectron-fake-menu')
//const ServerMock = require('mock-http-server')

describe('Application launch', function () {
  this.timeout(120000)
 
  //const server = new ServerMock({ host: "localhost", port: 12345 });

  beforeEach(function () {
    this.app = new Application({
      path: electronPath,
      args: [path.join(__dirname, '..')]
    })

    fakeMenu.apply(this.app);

    //server.start(done);
    
    return this.app.start()
  })

  afterEach(function () {
    if (this.app && this.app.isRunning()) {
      return this.app.stop()
     }

     //server.stop(done);
  })

  it('shows an initial window', function () {
    return this.app.client.getWindowCount().then(function (count) {
      assert.equal(count, 1)
      // Please note that getWindowCount() will return 2 if `dev tools` are opened.
      // assert.equal(count, 2)
    })
  })

  it('initial window title is INTO-CPS App', function () {
    return this.app.client.getTitle().then(function (title) {
      assert.equal(title, 'INTO-CPS App')
    })
  })

  it('displays Welcome in mainView', function () {
    return this.app.client.getText('#mainView').then(function (title) {
      expect(title).contain('Welcome to the INTO-CPS Application version ' + process.env.npm_package_version)
    })
  })

  //Step 2. To open a project, select File > Open Project
  it('File->Open Project Menu Click', function () {
    fakeMenu.clickMenu('File', 'Open Project');
  })

  //Step 5. Click the + symbol next to Non-3D multimodel to expand it
  //Step 6. Double click to open Experiment1.
  it('Go to Non-3D > Experiment1 from sidebar', function () {
    return this.app.client.$('#node_ProjectBrowserItem_28').$('.w2ui-expand').click()
      .doubleClick('#node_ProjectBrowserItem_29')
      .getText('#activeTabTitle')
      .then(function (title) {
        assert.equal(title, 'Non-3D > Experiment1')
      })
  })

  it('Co-Simulation Engine offline', function () {
    return this.app.client.$('#node_ProjectBrowserItem_28').$('.w2ui-expand').click()
      .doubleClick('#node_ProjectBrowserItem_29')
      .$('coe-simulation').$('.alert.alert-danger').getText()
      .then(function (text) {
        expect(text).contain('Co-Simulation Engine offline')
      })
  })

  //Step 7. Click Launch
  it('Co-Simulation Engine online', function () {
    return this.app.client.$('#node_ProjectBrowserItem_28').$('.w2ui-expand').click()
      .doubleClick('#node_ProjectBrowserItem_29')
      .$('coe-simulation').$('.btn.btn-sm.btn-default').click().pause(3000)
      .$('.alert.alert-success').getText()
      .then(function (text) {
        expect(text).contain('online')
      })
  })
  
  //Step 8. Click simulate to run a co-simulation
  it('Button shows Stop after clicking Simulate button', function(){
    return this.app.client.$('#node_ProjectBrowserItem_28').$('.w2ui-expand').click()
    .doubleClick('#node_ProjectBrowserItem_29')
    .$('coe-simulation').$('.btn.btn-sm.btn-default').click().pause(3000)
    .$('.btn.btn-default').click()
    .$('.btn.btn-default').getText()
    .then(function(text){
      expect(text).contain('Stop')
    })
  })

  it('Click on COE Console', function(){
    return this.app.client.$('#coe-status-btn-status').doubleClick().pause(3000)
    .$('.navbar-brand').getText()
    .then(function(text){
      expect(text).contain('COE Status')
    })
  })

  //Step 10. Expand the configuration
  it('Click Edit button to change the Co-Simulation parameters', function(){
    return this.app.client.$('#node_ProjectBrowserItem_28').$('.w2ui-expand').click()
    .doubleClick('#node_ProjectBrowserItem_29')
    .$('coe-page').$('.panel-heading').click()
    .$('.btn.btn-default').click()
    .$('.btn.btn-default').getText()
    .then(function(text){
      expect(text).contain('Save')
    })
  })

  //Step 11. Click Edit Button, set Start time 
  it('Change Start Time Co-Simulation parameter', function(){
    return this.app.client.$('#node_ProjectBrowserItem_28').$('.w2ui-expand').click()
    .doubleClick('#node_ProjectBrowserItem_29')
    .$('coe-page').$('.panel-heading').click()
    .$('.btn.btn-default').click().pause(3000)
    .$('.form-control.ng-untouched.ng-pristine.ng-valid').setValue('0')
    .$('.form-control.ng-untouched.ng-pristine.ng-valid').getValue()
    .then(function(text){
      expect(text).contain('0')
    })
  })

  /* Tutorial 2 */
  //step 2,6,7,8
  it('Add a new FMU entry from Configuration', function () {
    return this.app.client.$('#node_ProjectBrowserItem_21').doubleClick().pause(3000)
    .$('mm-page').$$('panel')[1].$('.panel-heading').click().pause(5000)                   //Since there are 2 identical panels, this tests takes the first panel id, and therefore closes overview! 
    .$('.btn.btn-default').click().pause(3000)
    .$('.btn.btn-default.btn-xs').click()
    .$('.form-control.input-fixed-size.input-sm.ng-untouched.ng-pristine.ng-valid').getValue()
      .then(function (text) {
        assert.equal(text, 'FMU')
      })
  })

  //step 24
  it('Right-click on the multi-model configuration and create Co-simulation Configuration', function () {
    return this.app.client.$('#node_ProjectBrowserItem_21').rightClick()
    .$('.w2ui-icon.glyphicon.glyphicon-copyright-mark').click().pause(3000)
    .$('#Ok').click().pause(2000)
    .getText('#activeTabTitle')
    .then(function (title) {
      expect(title).contain('3DRobot')
    })
  })

  /* Tutorial 7 */
  // step 2 Opening a DSE Configuration
  it('Select the Experiment/lfr-non3d multi model', function () {
    return this.app.client.$('#node_ProjectBrowserItem_4').doubleClick()
    .$('dse-configuration').$('.btn.btn-default').click().pause(3000)
    .$('.form-control.ng-untouched.ng-pristine.ng-valid')
    .selectByVisibleText('Experiment | lfr-non3d').pause(3000)
    .getText('option:checked')
    .then(function(text){
      expect(text).contain("lfr-non3d")
    })
  })

  it('Select the Experiment/lfr-non3d multi model and click save', function () {
    return this.app.client.$('#node_ProjectBrowserItem_4').doubleClick()
    .$('dse-configuration').$('.btn.btn-default').click().pause(3000)
    .$('.form-control.ng-untouched.ng-pristine.ng-valid')
    .selectByVisibleText('Experiment | lfr-non3d').pause(2000)
    .$('.btn.btn-default').click().pause(2000)
    .$('.form-control-static').getText()
    .then(function (text){
      expect(text).contain("lfr-non3d | Multi-models")
    })
  })

  it('algorithm choice Exhaustive showing after multi-model is set ', function () {
    return this.app.client.$('#node_ProjectBrowserItem_4').doubleClick()
    .$('dse-configuration').$('.btn.btn-default').click().pause(3000)
    .$('.form-control.ng-untouched.ng-pristine.ng-valid')
    .selectByVisibleText('Experiment | lfr-non3d').pause(2000)
    .$('.btn.btn-default').click().pause(2000)
    .$('.col-sm-7.col-md-8')
    .$('.form-control-static').getText()
    .then(function (text){
      expect(text).contain("Exhaustive")
    })
  })

  // //https://www.npmjs.com/package/mock-http-server/v/1.4.2
  // it('COE mock server', function(done) {
  //     server.on({
  //         method: 'GET', 
  //         path: '/version',
  //         reply: {
  //             status:  200,
  //             headers: { "content-type": "application/json" },
  //             body:    JSON.stringify({ version: "1.0.4", artifactId: "coe", groupId:"org.into-cps.orchestration" })
  //         }
  //     });

  //     done();
  //     // Now the server mock will handle a GET http://localhost:8082/version
  //     // and will reply with 200 
  // })
})
