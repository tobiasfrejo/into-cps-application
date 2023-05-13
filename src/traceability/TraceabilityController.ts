import path = require("path");
import IntoCpsApp from "../IntoCpsApp";
import { MultiModelConfig } from "../intocps-configurations/MultiModelConfig";
import { JsonLdBuilder } from "./JsonLdBuilder";
import { TraceMessageBuilder } from "./TraceMessageBuilder";
import { Activity, Trace, TrNode, Agent, Tool, Artefact } from "./models";
import { TraceabilityAPIClient } from "./trace-api-client";
import { GitConnector } from "./git-connector";

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
        let fmuUris = fmuPaths.map(fmuPath => {
            let relativePath = fmuPath.startsWith(rootPath) ? path.normalize(fmuPath.replace(rootPath, './')) : fmuPath
            let fmuNode = new Artefact().fmu(relativePath)
            builder.addNode(fmuNode)
            return fmuNode.uri
        })

        // Get MM file
        let mmConfNode = new Artefact().mmConfig(multiModelConfig.sourcePath)
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
            let prevMm = new Artefact().mmConfig(multiModelConfig.sourcePath, prevHash)
            builder.addNode(prevMm)
            builder.addTrace(new Trace(
                mmConfNode.uri,
                "prov:wasDerivedFrom",
                prevMm.uri
            ))
        }

        this.client.push(builder)
    }

    createTraceSimConfig = () => {
        // Get used MM
        // Get Simulation Config file
        // Create Simulaton Config activity
    }

    createTraceSimulation = () => {
        // Get FMUs from MM
        // Get results path
        // Create simulation activity
    }
}