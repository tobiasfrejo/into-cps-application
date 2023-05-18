import path = require("path");
import IntoCpsApp from "../IntoCpsApp";
import { MultiModelConfig } from "../intocps-configurations/MultiModelConfig";
import { JsonLdBuilder } from "./JsonLdBuilder";
import { TraceMessageBuilder } from "./TraceMessageBuilder";
import { Activity, Trace, TrNode, Agent, Tool, Artefact } from "./models";
import { TraceabilityAPIClient } from "./trace-api-client";
import { GitConnector } from "./git-connector";
import { CoSimulationConfig } from "../intocps-configurations/CoSimulationConfig";

export class TraceabilityController {
    client: TraceabilityAPIClient
    receivedData: Object

    constructor () {
        this.client = new TraceabilityAPIClient("http://localhost:8080/v2/")
    }

    createTraceMMConfig = (multiModelConfig: MultiModelConfig, prevHash:string = null) => {
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
            "prov:wasAssociatedWith",
            agent.uri
        ))
        builder.addTrace(new Trace(
            mmConfNode.uri,
            "prov:wasAttributedTo",
            agent.uri
        ))

        fmuUris.forEach(fmuUri => {
            builder.addTrace(new Trace(
                activity.uri,
                "prov:used",
                fmuUri
                ))
        })

        builder.addTrace(new Trace(
            mmConfNode.uri,
            "prov:wasGeneratedBy",
            activity.uri
        ))

        builder.addTrace(new Trace(
            activity.uri,
            "prov:used",
            app.uri
        ))

        if (prevHash) {
            let prevMm = new Artefact().mmConfig(relativeMmPath, prevHash)
            builder.addNode(prevMm)
            builder.addTrace(new Trace(
                mmConfNode.uri,
                "prov:wasDerivedFrom",
                prevMm.uri
            ))
        }

        this.client.push(builder)
    }

    createTraceCoSimConfig = (coSimConfig: CoSimulationConfig, prevHash: string) => {
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
            act.uri, "prov:used", mm.uri
        ))

        // Act -used-> App
        builder.addTrace(new Trace(
            act.uri, "prov:used", app.uri
        ))

        // conf -generatedBy-> Act
        builder.addTrace(new Trace(
            conf.uri, "prov:wasGeneratedBy", act.uri
        ))

        // conf -wasAttributedTo- agent
        builder.addTrace(new Trace(
            conf.uri, "prov:wasAttributedTo", agent.uri
        ))

        // act -wasAssociatedWith-> agent
        builder.addTrace(new Trace(
            act.uri, "prov:wasAssociatedWith", agent.uri
        ))
        

        // conf -derivedFrom-> prevConf 
        if (prevHash) {
            let prevMm = new Artefact().coSimConfig(relativeSourcePath, prevHash)
            builder.addNode(prevMm)
            builder.addTrace(new Trace(
                conf.uri,
                "prov:wasDerivedFrom",
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
        let rootPath = IntoCpsApp.getInstance().getActiveProject().getRootFilePath()
        let relativeSourcePath = path.relative(rootPath, coSimConfig.sourcePath)

        let builder = new TraceMessageBuilder()
        builder.addProjectNode()

        let agent = GitConnector.getUserAsAgent()
        builder.addNode(agent)

        let app = new Tool().intoCpsApp()
        builder.addNode(app)

        let coe = new Tool().setParameters(
            "intocps:coSimulationEngine",
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

        builder.addTrace(new Trace(activity.uri, "prov:used", app.uri))
        builder.addTrace(new Trace(activity.uri, "prov:used", coe.uri))
        builder.addTrace(new Trace(activity.uri, "prov:used", cosim.uri))
        builder.addTrace(new Trace(activity.uri, "prov:used", mm.uri))
        builder.addTrace(new Trace(activity.uri, "prov:wasAssociatedWith", agent.uri))
        fmuUris.forEach(fmuUri => {
            builder.addTrace(new Trace(activity.uri, "prov:used", fmuUri))
        })

        builder.addTrace(new Trace(result.uri, "prov:wasGeneratedBy", activity.uri))
        builder.addTrace(new Trace(result.uri, "prov:wasAttributedTo", agent.uri))


        this.client.push(builder)
    }
}