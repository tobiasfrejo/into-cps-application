import path = require("path");
import IntoCpsApp from "../IntoCpsApp";
import { MultiModelConfig } from "../intocps-configurations/MultiModelConfig";
import { TraceMessageBuilder } from "./TraceMessageBuilder";
import { Activity, Trace, Tool, Artefact } from "./models";
import { TraceabilityAPIClient } from "./trace-api-client";
import { GitConnector } from "./git-connector";
import { CoSimulationConfig } from "../intocps-configurations/CoSimulationConfig";
import { Prov, ToolType } from "./TraceabilityKeys";
import { SettingKeys } from "../settings/SettingKeys";

export class TraceabilityController {
    client: TraceabilityAPIClient
    enabled: boolean = false

    constructor () {
        // Wait until the IntoCpsApp has initialized fully
        const checkAppInitialized = () => {
            if (!IntoCpsApp.getInstance()) {
                setTimeout(checkAppInitialized, 50)
            } else {
                this.intialize()
            }
        }
        checkAppInitialized()
    }

    intialize = () => {
        this.enabled = IntoCpsApp.getInstance().getSettings().getValue(SettingKeys.ENABLE_TRACEABILITY)

        if (!this.enabled) return
        this.client = new TraceabilityAPIClient(path.join(IntoCpsApp.getInstance().getSettings().getValue(SettingKeys.TRACEABILITY_SERVER_URL), "v2/"))
    }

    createTraceMMConfig = (multiModelConfig: MultiModelConfig, prevHash:string = null) => {
        if (!this.enabled) return

        if (GitConnector.getFileHash(multiModelConfig.sourcePath) == prevHash) return
        
        let builder = new TraceMessageBuilder()
        builder.addProjectNode()

        let agent = GitConnector.getUserAsAgent()
        builder.addNode(agent)

        let app = new Tool().intoCpsApp()
        builder.addNode(app)

        // Get FMUs in MM
        let fmuPaths = multiModelConfig.fmus.map(fmu => fmu.path)
        let rootPath = IntoCpsApp.getInstance().getActiveProject().getRootFilePath()
        let relativeMmPath = path.relative(rootPath, multiModelConfig.sourcePath)

        let fmuUris = fmuPaths.map(fmuPath => {
            let relativePath = path.relative(rootPath, fmuPath)
            let fmuNode = new Artefact().fmu(relativePath)
            builder.addNode(fmuNode)
            return fmuNode.uri
        })

        // Get MM file
        let mmConfNode = new Artefact().mmConfig(relativeMmPath)
        builder.addNode(mmConfNode)

        // Create MM Config Activity
        let activity = new Activity().mmConfigCreation()
        builder.addNode(activity)


        // Add traces
        builder.addTrace(new Trace(
            activity.uri,
            Prov.WASASSOCIATEDWITH,
            agent.uri
        ))
        builder.addTrace(new Trace(
            mmConfNode.uri,
            Prov.WASATTRIBUTEDTO,
            agent.uri
        ))

        fmuUris.forEach(fmuUri => {
            builder.addTrace(new Trace(
                activity.uri,
                Prov.USED,
                fmuUri
                ))
        })

        builder.addTrace(new Trace(
            mmConfNode.uri,
            Prov.WASGENERATEDBY,
            activity.uri
        ))

        builder.addTrace(new Trace(
            activity.uri,
            Prov.USED,
            app.uri
        ))

        if (prevHash) {
            let prevMm = new Artefact().mmConfig(relativeMmPath, prevHash)
            builder.addNode(prevMm)
            builder.addTrace(new Trace(
                mmConfNode.uri,
                Prov.WASDERIVEDFROM,
                prevMm.uri
            ))
        }

        this.client.push(builder)
    }

    createTraceCoSimConfig = (coSimConfig: CoSimulationConfig, prevHash: string = null) => {
        if (!this.enabled) return

        // Do nothing if file is unchanged
        if (GitConnector.getFileHash(coSimConfig.sourcePath) == prevHash) {
            console.log("No change in config. Will not send trace!")
            return
        }

        let rootPath = IntoCpsApp.getInstance().getActiveProject().getRootFilePath()
        let relativeSourcePath = path.relative(rootPath, coSimConfig.sourcePath)

        let builder = new TraceMessageBuilder()
        builder.addProjectNode()

        let agent = GitConnector.getUserAsAgent()
        builder.addNode(agent)

        let app = new Tool().intoCpsApp()
        builder.addNode(app)

        
        // Get used MM
        let mm = new Artefact().mmConfig(path.relative(rootPath, coSimConfig.multiModel.sourcePath))
        builder.addNode(mm)

        // Get Simulation Config file
        let conf = new Artefact().coSimConfig(relativeSourcePath)
        builder.addNode(conf)

        // Create Simulaton Config activity
        let act = new Activity().coSimConfigCreation()
        builder.addNode(act)


        /* TRACES */
        // Act -used-> MM
        builder.addTrace(new Trace(
            act.uri, Prov.USED, mm.uri
        ))

        // Act -used-> App
        builder.addTrace(new Trace(
            act.uri, Prov.USED, app.uri
        ))

        // conf -generatedBy-> Act
        builder.addTrace(new Trace(
            conf.uri, Prov.WASGENERATEDBY, act.uri
        ))

        // conf -wasAttributedTo- agent
        builder.addTrace(new Trace(
            conf.uri, Prov.WASATTRIBUTEDTO, agent.uri
        ))

        // act -wasAssociatedWith-> agent
        builder.addTrace(new Trace(
            act.uri, Prov.WASASSOCIATEDWITH, agent.uri
        ))
        

        // conf -derivedFrom-> prevConf 
        if (prevHash) {
            let prevMm = new Artefact().coSimConfig(relativeSourcePath, prevHash)
            builder.addNode(prevMm)
            builder.addTrace(new Trace(
                conf.uri,
                Prov.WASDERIVEDFROM,
                prevMm.uri
            ))
        }

        this.client.push(builder)
    }

    createTraceSimulation = (
        coSimConfig: CoSimulationConfig, 
        coeInfo: {"name":string, "version":string},
        resultPath: string
    ) => {
        if (!this.enabled) return

        let rootPath = IntoCpsApp.getInstance().getActiveProject().getRootFilePath()
        let relativeSourcePath = path.relative(rootPath, coSimConfig.sourcePath)

        let builder = new TraceMessageBuilder()
        builder.addProjectNode()

        let agent = GitConnector.getUserAsAgent()
        builder.addNode(agent)

        let app = new Tool().intoCpsApp()
        builder.addNode(app)

        let coe = new Tool().setParameters(
            ToolType.COE,
            coeInfo.name,
            coeInfo.version
        )
        builder.addNode(coe)



        let cosim = new Artefact().coSimConfig(path.relative(rootPath, coSimConfig.sourcePath))
        builder.addNode(cosim)

        let mm = new Artefact().mmConfig(path.relative(rootPath, coSimConfig.multiModel.sourcePath))
        builder.addNode(mm)


        // Get FMUs in MM
        let fmuPaths = coSimConfig.multiModel.fmus.map(fmu => fmu.path)

        let fmuUris = fmuPaths.map(fmuPath => {
            let relativePath = path.relative(rootPath, fmuPath)
            let fmuNode = new Artefact().fmu(relativePath)
            builder.addNode(fmuNode)
            return fmuNode.uri
        })

        // Get result
        let result = new Artefact().result(path.relative(rootPath, resultPath))
        builder.addNode(result)

        // Create simulation activity
        let activity = new Activity().simulation()
        builder.addNode(activity)

        builder.addTrace(new Trace(activity.uri, Prov.USED, app.uri))
        builder.addTrace(new Trace(activity.uri, Prov.USED, coe.uri))
        builder.addTrace(new Trace(activity.uri, Prov.USED, cosim.uri))
        builder.addTrace(new Trace(activity.uri, Prov.USED, mm.uri))
        builder.addTrace(new Trace(activity.uri, Prov.WASASSOCIATEDWITH, agent.uri))
        fmuUris.forEach(fmuUri => {
            builder.addTrace(new Trace(activity.uri, Prov.USED, fmuUri))
        })

        builder.addTrace(new Trace(result.uri, Prov.WASGENERATEDBY, activity.uri))
        builder.addTrace(new Trace(result.uri, Prov.WASATTRIBUTEDTO, agent.uri))


        this.client.push(builder)
    }
}