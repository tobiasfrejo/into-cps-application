import * as http from 'http'
import * as https from'https'
import { Activity, Agent, Artefact, TrNode, Trace } from './models';

import { Readable, Stream } from 'stream';
import { Tool } from './models';

import * as jsonld from 'jsonld'
import * as N3 from 'n3'
import IntoCpsApp from '../IntoCpsApp';



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


    // Based on the example from the node docs: 
    // https://nodejs.org/docs/latest-v14.x/api/http.html#http_http_get_url_options_callback
    handleResponse = (callback: (data: Object) => void = undefined) => {
        return (res: http.IncomingMessage) => {
            const {statusCode} = res;
            const contentType = res.headers['content-type'];
            console.log(statusCode, contentType)
            
            let error;
            if (statusCode != 200) {
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
            let subj = this.applyContext(quad.subject.value)
            let pred = this.applyContext(quad.predicate.value)
            let obje = this.applyContext(quad.object.value)

            // Sort the returned RDF quads into traces and node parameters

            if (quad.predicate.value in tracePredicates) {
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

        // Create node instances
        for (const [sid, kv] of Object.entries(rdfNodes)) {
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
                            new Date(kv['date'])
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

        for(const [term, uri] of Object.entries(terms)) {
            if (val === uri) return term
        }

        for(const [prefix, full] of Object.entries(prefixes)) {
            if (val.startsWith(full))
                return val.replace(full, prefix+':')
        }

        return val
    }

    getSimulations() {
        let params = {
            "projectId": IntoCpsApp.getInstance().activeProject.getId(),
            "intocps:ActivityType": "intocps:Simulation"
        }

        return this.sendGet("nodes", params)
    }

        
}

export {TraceabilityAPIClient}