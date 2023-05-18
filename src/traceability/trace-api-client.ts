import * as http from 'http'
import * as https from'https'
import { Activity, Agent, Artefact, TrNode, Trace, getActiveProjectUri } from './models';

import { Readable, Stream } from 'stream';
import { Tool } from './models';

import * as jsonld from 'jsonld'
import * as N3 from 'n3'
import { DataFactory } from 'n3';
import IntoCpsApp from '../IntoCpsApp';
import  { terms, prefixes, applyContext, expandWithContext } from './contextHelper'
import { TraceMessageBuilder } from './TraceMessageBuilder';
import { ActivityType, ArtefactType, IntocpsPredicate } from './TraceabilityKeys';

const { namedNode, literal, quad } = DataFactory

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
                .get(url.href, options, this.handleDataResponse(resolve))
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

        return new Promise<void>((resolve, reject) => {
            const req = httpX(url)
                .request(url.href, options, this.handleSimpleResponse(resolve))
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
    handleDataResponse = (callback: (data: Object) => void = undefined) => {
        return (res: http.IncomingMessage) => {
            const {statusCode} = res;
            const contentType = res.headers['content-type'];
            console.log(statusCode, contentType)
            
            let error;
            if (statusCode >= 300) {
                error = new Error(`Request failed with code: ${statusCode}`)
            } 
            // else if (!/^application\/(ld\+)?json/.test(contentType)) {
            //     error = new Error(`Invalid content type ${contentType}. `+
            //             `Expected 'application/json' or 'application/ld+json'`)
            // }
    
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
                    let output = this.parseObjects(rawData, contentType)
                    callback(output)

                    //const parsed = JSON.parse(rawData)
                    //callback(parsed)
                } catch (e) {
                    console.error(e)
                }
            });
        }
    }

    handleSimpleResponse = (resolve: (value: void) => void = () => {}) => {
        return (res: http.IncomingMessage) => {
            const {statusCode} = res;
            const contentType = res.headers['content-type'];
            console.log(statusCode, contentType)
            
            let error;
            if (statusCode >= 300) {
                error = new Error(`Request failed with code: ${statusCode}`)
            } 
    
            if (error) {
                res.destroy(error)
                return;
            }

            resolve()
        }
    }

    parseObjects = async (data: string, contentType: string) => {
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

        let nquads;
        if (contentType.split(';')[0] == "application/ld+json") {
            nquads = await jsonld.toRDF(JSON.parse(data))
        } else if (["text/turtle",
                    "application/n-triples",
                    "application/n-quads",
                    "application/trig"
                    ].includes(contentType.split(';')[0])) {
            let parser = new N3.Parser()
            nquads = parser.parse(data)
        } else {
            console.log("Unsupported content type", contentType)
            return {}
        }

        Object.values(nquads).forEach(quad => {
            console.log("[Quad]", quad)

            let subj = applyContext(quad.subject.value)
            let pred = applyContext(quad.predicate.value)
            let obje = applyContext(quad.object.value)

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

            nodes.push(new TrNode().load(sid, kv))
        }

        return {nodes, traces}
    }

    getSimulations() {
        let params = {
            "projectId": getActiveProjectUri(),
            [IntocpsPredicate.ACTIVITYTYPE]: ActivityType.SIMULATION
        }

        return this.sendGet("nodes", params)
    }

    getFmusInSimulation(simUri: string) {
        let params = {
            [IntocpsPredicate.ARTEFACTTYPE]: ArtefactType.FMU
        }

        return this.sendGet("traces/from/" + simUri,  params)
    }


    push(builder: TraceMessageBuilder) {
        return builder.writerEnd( j => {
            return this.sendPost("push", j)
        })
    }
}

export {TraceabilityAPIClient}