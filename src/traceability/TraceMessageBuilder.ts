import { Activity, Agent, Artefact, Tool, TrNode, Trace, getActiveProjectUri } from "./models";
import * as N3 from 'n3'
import { DataFactory } from 'n3';
import IntoCpsApp from "../IntoCpsApp";
import { GitConnector } from "./git-connector";
const { namedNode, literal, quad } = DataFactory
import * as jsonld from 'jsonld'
import  { terms, prefixes, applyContext, expandWithContext } from './contextHelper'
import path = require("path");
import fs = require("fs");
import { Project } from "../proj/Project";
import { EntityType, IntocpsPredicate, Prov } from "./TraceabilityKeys";

export class TraceMessageBuilder {
    writer: N3.Writer
    projectUri: string

    constructor() {
        this.writer = new N3.Writer({prefixes, format: 'N-Triples'})
        this.projectUri = getActiveProjectUri()
    }

    addProjectNode() {
        this.writer.addQuad(
            namedNode(expandWithContext(this.projectUri)),
            namedNode(expandWithContext("type")),
            namedNode(expandWithContext(Prov.ENTITY))
        )
        this.writer.addQuad(
            namedNode(expandWithContext(this.projectUri)),
            namedNode(expandWithContext(IntocpsPredicate.ENTITYTYPE)),
            namedNode(expandWithContext(EntityType.PROJECT))
        )
        this.writer.addQuad(
            namedNode(expandWithContext(this.projectUri)),
            namedNode(expandWithContext("name")),
            literal(IntoCpsApp.getInstance().activeProject.getName())
        )
    }
    


    addNode(node: TrNode, autoAssociate:Boolean=false) {
        let n
        switch (node.className) {
            case "Activity":
                n = node as Activity
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode(expandWithContext("type")),
                    namedNode(expandWithContext(Prov.ACTIVITY))
                )
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode(expandWithContext(IntocpsPredicate.ACTIVITYTYPE)),
                    namedNode(expandWithContext(n.type))
                )
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode(expandWithContext("time")),
                    literal(n.time.toISOString())
                )
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode(expandWithContext(IntocpsPredicate.INPROJECT)),
                    namedNode(expandWithContext(this.projectUri))
                )
                if (autoAssociate) {
                    let agent = GitConnector.getUserAsAgent()
                    this.addNode(agent)
                    this.writer.addQuad(
                        namedNode(expandWithContext(n.uri)),
                        namedNode(expandWithContext(Prov.WASASSOCIATEDWITH)),
                        namedNode(agent.uri)
                    )
                }
                break;
                
            case "Agent":
                n = node as Agent
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode(expandWithContext("type")),
                    namedNode(expandWithContext(Prov.AGENT))
                )
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode(expandWithContext("name")),
                    literal(n.name)
                )
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode(expandWithContext("email")),
                    literal(n.email)
                )
                break;
            
            case "Artefact":
                n = node as Artefact
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode(expandWithContext("type")),
                    namedNode(expandWithContext(Prov.ENTITY))
                )
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode(expandWithContext(IntocpsPredicate.ENTITYTYPE)),
                    namedNode(expandWithContext(EntityType.ARTEFACT))
                )
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode(expandWithContext(IntocpsPredicate.ARTEFACTTYPE)),
                    namedNode(expandWithContext(n.type))
                )
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode(expandWithContext("path")),
                    literal(n.path)
                )
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode(expandWithContext("hash")),
                    literal(n.hash)
                )
                break;
                
            case "Tool":
                n = node as Tool
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode(expandWithContext("type")),
                    namedNode(expandWithContext(Prov.ENTITY))
                )
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode(expandWithContext(IntocpsPredicate.ENTITYTYPE)),
                    namedNode(expandWithContext(EntityType.TOOL))
                )
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode(expandWithContext(IntocpsPredicate.TOOLTYPE)),
                    namedNode(expandWithContext(n.type))
                )
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode(expandWithContext("name")),
                    literal(n.name)
                )
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode(expandWithContext("version")),
                    literal(n.version)
                )
                break;
        
            default:
                console.warn("Default case; ", node.constructor.name)
                break;
        }
    }

    addTrace(trace: Trace) {
        this.writer.addQuad(
            namedNode(expandWithContext(trace.subject)),
            namedNode(expandWithContext(trace.predicate)),
            namedNode(expandWithContext(trace.object))
        )
    }


    writerEnd = (callback: (jsonldObject: Object) => Promise<void>, localSave:Boolean=false) => {
        return new Promise((resolve, reject) => {
            this.writer.end(async (error, result) => {
                if (error) {
                    reject(error)
                    return
                }
                
                try {
                    const j1 = await jsonld.fromRDF(result, {format: "application/n-quads"})
                    const j2 = await jsonld.compact(j1, {...prefixes, ...terms})

                    if (localSave) {
                        this.localSave(j2)
                    }
    
                    resolve(callback(j2))
                } catch (err) {
                    let lineNumMatch = err.message.match(/N-Quads parse error on line (\d+)/)
                    if (lineNumMatch) {
                        console.error("Error in N-Quads, line", lineNumMatch[1], ":", result.split("\n")[lineNumMatch[1]-1])
                    } else {
                        console.error(err)
                    }
                    reject(err)
                }
            })
        })
    }

    localSave(jsonMessage: jsonld.NodeObject) {
        let now = new Date()
        console.log("Creating file path")
        let filepath = path.join(
            IntoCpsApp.getInstance().activeProject.getRootFilePath(),
            Project.PATH_TRACEABILITY,
            "messages",
            now.toISOString().replace(/[\-:Z\.]/gim, '')+".jsonld"
        )
        fs.mkdirSync(path.dirname(filepath), {recursive: true})

        console.log("Writing jsonld to", filepath)
        fs.writeFileSync(filepath, JSON.stringify(jsonMessage, null, 2), )
        console.log("After")
    }
}