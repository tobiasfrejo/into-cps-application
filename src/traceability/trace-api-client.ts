import * as http from 'http'
import * as https from'https'
import { Activity, Agent, Artefact, TrNode, Trace } from './models';

import { Readable, Stream } from 'stream';
import { Tool } from './models';

import * as jsonld from 'jsonld'
import * as N3 from 'n3'
import { DataFactory } from 'n3';
import IntoCpsApp from '../IntoCpsApp';

const { namedNode, literal, quad } = DataFactory

const terms: {[key: string]: string} = {
    "name": "https://schema.org/name",
    "email": "https://schema.org/email",
    "hash": "https://schema.org/sha256",
    "time": "https://schema.org/DateTime",
    "type": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    "path": "http://into-cps.org/ns#Path",
}
const prefixes: {[key: string]: string} = {
    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "prov": "http://www.w3.org/ns/prov#",
    "intocps": "http://into-cps.org/ns#",
}

// Return the corresponding module based on URL
let httpX = (url:URL) => {
    //console.log(`Getting proto for url ${url.href}: ${url.protocol}`)
    if (url.protocol === 'https:')
        return https;
    else return http
}

class TraceabilityAPIClient {
    baseUrl: string
    constructor (url: string) {
        this.baseUrl = url
    }

    sendGet = (path:string, parameters:object=null) => {
        let url = new URL(path, this.baseUrl)
        let options = {
            headers: {
                "Accept": "application/ld+json, application/json"
            }
        }

        if (parameters != null)
            for (const [key, value] of Object.entries(parameters))
                url.searchParams.append(key, value)
        
        console.log(`Sending GET to ${url.href}`)

        return new Promise((resolve, reject) => {
            httpX(url)
                .get(url.href, options, this.handleResponse(resolve))
                .on('error', e => {
                    console.error(`Got error: ${e.message}`)
                    reject(e)
                })
        })
    }

    sendPost = (path:string, data:object) => {
        let url = new URL(path, this.baseUrl)
        let options = {
            headers: {
                "Accept": "application/ld+json, application/json",
                "Content-Type": "application/ld+json"
            },
            method: "POST"
        }

        return new Promise((resolve, reject) => {
            const req = httpX(url)
                .request(url.href, options, this.handleResponse(resolve))
                .on('error', e => {
                    reject(e)
                });
            req.write(JSON.stringify(data));
            req.end();
        })
        console.log(data)
    }


    // Based on the example from the node docs: 
    // https://nodejs.org/docs/latest-v14.x/api/http.html#http_http_get_url_options_callback
    handleResponse = (callback: (data: Object) => void = undefined) => {
        return (res: http.IncomingMessage) => {
            const {statusCode} = res;
            const contentType = res.headers['content-type'];
            console.log(statusCode, contentType)
            
            let error;
            if (statusCode >= 300) {
                error = new Error(`Request failed with code: ${statusCode}`)
            } else if (!/^application\/(ld\+)?json/.test(contentType)) {
                error = new Error(`Invalid content type ${contentType}. `+
                        `Expected 'application/json' or 'application/ld+json'`)
            }
    
            if (error) {
                res.destroy(error)
                return;
            }
    
            res.setEncoding('utf-8')
            let rawData = '';
            res.on('data', (chunk) => {rawData += chunk})
            res.on('end', () => {
                try {
                    let input = new Readable({
                        read: () => {
                            input.push(rawData)
                        }
                    })
                    //console.log(rawData)
                    let output = this.parseObjects(rawData)
                    callback(output)

                    //const parsed = JSON.parse(rawData)
                    //callback(parsed)
                } catch (e) {
                    console.error(e)
                }
            });
        }
    }


    parseObjects = async (data: string) => {
        const parser = new N3.Parser()

        let nodes: Array<TrNode> = []
        let traces: Array<Trace> = []

        const tracePredicates = [
            "http://www.w3.org/ns/prov#wasGeneratedBy",
            "http://www.w3.org/ns/prov#wasDerivedFrom",
            "http://www.w3.org/ns/prov#wasAttributedTo",
            "http://www.w3.org/ns/prov#startedAtTime",
            "http://www.w3.org/ns/prov#used",
            "http://www.w3.org/ns/prov#wasInformedBy",
            "http://www.w3.org/ns/prov#endedAtTime",
            "http://www.w3.org/ns/prov#wasAssociatedWith",
            "http://www.w3.org/ns/prov#actedOnBehalfOf",
        ]

        type T1 = {[predicate: string]: string}
        type T2 = {[uri: string]: T1}
        let rdfNodes: T2 = {}

        let nquads = await jsonld.toRDF(JSON.parse(data))
        Object.values(nquads).forEach(quad => {
            console.log("[Quad]", quad)

            let subj = this.applyContext(quad.subject.value)
            let pred = this.applyContext(quad.predicate.value)
            let obje = this.applyContext(quad.object.value)

            // Sort the returned RDF quads into traces and node parameters

            if (tracePredicates.includes(quad.predicate.value)) {
                traces.push(new Trace(
                    subj,
                    pred,
                    obje
                ))
                return;
            }

            if (!(subj in rdfNodes)) {
                rdfNodes[subj] = {}
            }
            rdfNodes[subj][pred] = obje
        })

        console.log(traces)
        console.log(rdfNodes)

        // Create node instances
        for (const [sid, kv] of Object.entries(rdfNodes)) {
            console.log(sid, JSON.stringify(kv, null, 2))

            if ('type' in kv) {
                switch (kv['type']) {
                    case 'prov:Agent':
                        nodes.push(new Agent(
                            sid, 
                            kv['name'], 
                            kv['email']
                        ))
                        break;
                    
                    case 'prov:Activity':
                        nodes.push(new Activity(
                            sid, 
                            kv['type'], 
                            new Date(kv['time'])
                        ))
                        break;

                    case 'prov:Entity':
                        if (!('intocps:EntityType' in kv)) {
                            console.error("Improper Entity: " + sid)
                            console.debug(JSON.stringify(kv, null, 2))
                        }

                        else if (kv['intocps:EntityType'] === 'intocps:Tool')
                            nodes.push(new Tool(
                                sid, 
                                kv['intocps:ToolType'], 
                                kv['name'], 
                                kv['intocps:version']
                            ))

                        else if (kv['intocps:EntityType'] === 'intocps:Artefact')
                            nodes.push(new Artefact(
                                sid, 
                                kv['intocps:ArtefactType'],
                                kv['path'],
                                kv['hash']
                            ))
                        
                        break;

                    default:
                        break;
                }
            }
        }

        return {nodes, traces}
    }

    applyContext = (val: string) => {
        for(const [term, uri] of Object.entries(terms)) {
            if (val === uri) return term
        }

        for(const [prefix, full] of Object.entries(prefixes)) {
            if (val.startsWith(full))
                return val.replace(full, prefix+':')
        }

        return val
    }

    expandWithContext = (val:string) => {
        if (val in terms) {
            return terms[val]
        }

        for(const [prefix, full] of Object.entries(prefixes)) {
            if (val.startsWith(prefix+':')) {
                return val.replace(prefix+':', full)
            }
        }

        return val
    }

    getSimulations() {
        let params = {
            "projectId": "intocps:project." + IntoCpsApp.getInstance().activeProject.getId(),
            "intocps:ActivityType": "intocps:Simulation"
        }

        return this.sendGet("nodes", params)
    }

    getFmusInSimulation(simUri: string) {
        let params = {
            "intocps:ArtefactType": "intocps:fmu"
        }

        return this.sendGet("traces/from/" + simUri,  params)
    }


    post(nodes: Array<TrNode> = [], traces: Array<Trace> = []) {
        const writer = new N3.Writer({prefixes, format: 'N-Triples'})

        traces.forEach(tr => {
            writer.addQuad(
                namedNode(this.expandWithContext(tr.subject)),
                namedNode(this.expandWithContext(tr.predicate)),
                namedNode(this.expandWithContext(tr.object))
            )
        })

        let projectUri = "intocps:project." + IntoCpsApp.getInstance().activeProject.getId()
        writer.addQuad(
            namedNode(this.expandWithContext(projectUri)),
            namedNode(this.expandWithContext("type")),
            namedNode(this.expandWithContext("prov:Entity"))
        )
        writer.addQuad(
            namedNode(this.expandWithContext(projectUri)),
            namedNode(this.expandWithContext("intocps:EntityType")),
            namedNode(this.expandWithContext("intocps:Project"))
        )
        writer.addQuad(
            namedNode(this.expandWithContext(projectUri)),
            namedNode(this.expandWithContext("name")),
            literal(IntoCpsApp.getInstance().activeProject.getName())
        )

        // Should probably be moved into models
        nodes.forEach(nd => {
            console.log(nd)
            let node
            switch (nd.className) {
                case "Activity":
                    node = nd as Activity
                    writer.addQuad(
                        namedNode(this.expandWithContext(node.uri)),
                        namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
                        namedNode("http://www.w3.org/ns/prov#Activity")
                    )
                    writer.addQuad(
                        namedNode(this.expandWithContext(node.uri)),
                        namedNode(this.expandWithContext("intocps:ActivityType")),
                        namedNode(this.expandWithContext(node.type))
                    )
                    writer.addQuad(
                        namedNode(this.expandWithContext(node.uri)),
                        namedNode(this.expandWithContext("time")),
                        literal(node.time.toISOString())
                    )
                    writer.addQuad(
                        namedNode(this.expandWithContext(node.uri)),
                        namedNode(this.expandWithContext("intocps:InProject")),
                        namedNode(this.expandWithContext(projectUri))
                    )
                    break;
                    
                case "Agent":
                    node = nd as Agent
                    writer.addQuad(
                        namedNode(this.expandWithContext(node.uri)),
                        namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
                        namedNode("http://www.w3.org/ns/prov#Agent")
                    )
                    writer.addQuad(
                        namedNode(this.expandWithContext(node.uri)),
                        namedNode(this.expandWithContext("name")),
                        literal(node.name)
                    )
                    writer.addQuad(
                        namedNode(this.expandWithContext(node.uri)),
                        namedNode(this.expandWithContext("email")),
                        literal(node.email)
                    )
                    break;
                
                case "Artefact":
                    node = nd as Artefact
                    writer.addQuad(
                        namedNode(this.expandWithContext(node.uri)),
                        namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
                        namedNode("http://www.w3.org/ns/prov#Entity")
                    )
                    writer.addQuad(
                        namedNode(this.expandWithContext(node.uri)),
                        namedNode(this.expandWithContext("intocps:EntityType")),
                        namedNode(this.expandWithContext("intocps:Artefact"))
                    )
                    writer.addQuad(
                        namedNode(this.expandWithContext(node.uri)),
                        namedNode(this.expandWithContext("intocps:ArtefactType")),
                        namedNode(this.expandWithContext(node.type))
                    )
                    writer.addQuad(
                        namedNode(this.expandWithContext(node.uri)),
                        namedNode(this.expandWithContext("path")),
                        literal(node.path)
                    )
                    writer.addQuad(
                        namedNode(this.expandWithContext(node.uri)),
                        namedNode(this.expandWithContext("hash")),
                        literal(node.hash)
                    )
                    break;
                    
                case "Tool":
                    node = nd as Tool
                    writer.addQuad(
                        namedNode(this.expandWithContext(node.uri)),
                        namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
                        namedNode("http://www.w3.org/ns/prov#Entity")
                    )
                    writer.addQuad(
                        namedNode(this.expandWithContext(node.uri)),
                        namedNode(this.expandWithContext("intocps:EntityType")),
                        namedNode(this.expandWithContext("intocps:Tool"))
                    )
                    writer.addQuad(
                        namedNode(this.expandWithContext(node.uri)),
                        namedNode(this.expandWithContext("intocps:ToolType")),
                        namedNode(this.expandWithContext(node.type))
                    )
                    writer.addQuad(
                        namedNode(this.expandWithContext(node.uri)),
                        namedNode(this.expandWithContext("name")),
                        literal(node.name)
                    )
                    writer.addQuad(
                        namedNode(this.expandWithContext(node.uri)),
                        namedNode(this.expandWithContext("version")),
                        literal(node.version)
                    )
                    break;
            
                default:
                    console.warn("Default case; ", nd.constructor.name)
                    break;
            }
        })

        writer.end(async (error, result) => {
            console.log(result)

            const j1 = await jsonld.fromRDF(result, {format: "application/n-quads"})
            const j2 = await jsonld.compact(j1, {...prefixes, ...terms})

            this.sendPost("push", j2)
        })
    }        
}

export {TraceabilityAPIClient}