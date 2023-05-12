import { Activity, Agent, Artefact, Tool, TrNode, Trace } from "./models";
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

export class TraceMessageBuilder {
    writer: N3.Writer
    projectUri: string

    constructor() {
        this.writer = new N3.Writer({prefixes, format: 'N-Triples'})
        this.projectUri = "intocps:project." + IntoCpsApp.getInstance().activeProject.getId()
    }

    addProjectNode() {
        this.writer.addQuad(
            namedNode(expandWithContext(this.projectUri)),
            namedNode(expandWithContext("type")),
            namedNode(expandWithContext("prov:Entity"))
        )
        this.writer.addQuad(
            namedNode(expandWithContext(this.projectUri)),
            namedNode(expandWithContext("intocps:EntityType")),
            namedNode(expandWithContext("intocps:Project"))
        )
        this.writer.addQuad(
            namedNode(expandWithContext(this.projectUri)),
            namedNode(expandWithContext("name")),
            literal(IntoCpsApp.getInstance().activeProject.getName())
        )
    }
    


    addNode(node: TrNode, autoAssociate:Boolean=true) {
        let n
        switch (node.className) {
            case "Activity":
                n = node as Activity
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
                    namedNode("http://www.w3.org/ns/prov#Activity")
                )
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode(expandWithContext("intocps:ActivityType")),
                    namedNode(expandWithContext(n.type))
                )
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode(expandWithContext("time")),
                    literal(n.time.toISOString())
                )
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode(expandWithContext("intocps:InProject")),
                    namedNode(expandWithContext(this.projectUri))
                )
                if (autoAssociate) {
                    let agent = GitConnector.getUserAsAgent()
                    this.addNode(agent)
                    this.writer.addQuad(
                        namedNode(expandWithContext(n.uri)),
                        namedNode(expandWithContext("prov:wasAssociatedWith")),
                        namedNode(agent.uri)
                    )

                    

                }
                break;
                
            case "Agent":
                n = node as Agent
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
                    namedNode("http://www.w3.org/ns/prov#Agent")
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
                    namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
                    namedNode("http://www.w3.org/ns/prov#Entity")
                )
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode(expandWithContext("intocps:EntityType")),
                    namedNode(expandWithContext("intocps:Artefact"))
                )
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode(expandWithContext("intocps:ArtefactType")),
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
                    namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
                    namedNode("http://www.w3.org/ns/prov#Entity")
                )
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode(expandWithContext("intocps:EntityType")),
                    namedNode(expandWithContext("intocps:Tool"))
                )
                this.writer.addQuad(
                    namedNode(expandWithContext(n.uri)),
                    namedNode(expandWithContext("intocps:ToolType")),
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


    writerEnd = (callback: (jsonldObject: Object) => Promise<void>, localSave:Boolean=true) => {
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
                    console.error(err)
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